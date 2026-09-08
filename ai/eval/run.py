"""평가 실행기.

    python -m eval.run --retrieval     검색 정확도 (임베딩 키 필요)
    python -m eval.run --metrics       지표 자체 점검 (키 불필요)

키가 없으면 해당 항목만 건너뛰고 나머지는 돈다. 키가 생겼을 때 바로 측정할 수
있도록 미리 만들어 두는 것이 목적이라, 지금 못 도는 부분도 형태는 갖춰 둔다.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
import re
import statistics
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter

EVAL_DIR = Path(__file__).resolve().parent
RETRIEVAL_SET = EVAL_DIR / "retrieval.yaml"


@dataclass
class RetrievalCase:
    id: str
    query: str
    ticker: str | None
    expect_title_contains: list[str]
    expect_empty: bool = False


@dataclass(frozen=True)
class LatencySummary:
    samples: int
    median_ms: float
    p95_ms: float


def _summarize_latency_ms(samples: list[float]) -> LatencySummary:
    """검색 지연 표본을 중앙값과 nearest-rank p95로 요약한다."""
    if not samples:
        raise ValueError("지연 표본이 비어 있다")
    ordered = sorted(samples)
    p95_index = math.ceil(len(ordered) * 0.95) - 1
    return LatencySummary(
        samples=len(ordered),
        median_ms=statistics.median(ordered),
        p95_ms=ordered[p95_index],
    )


def _summary_payload(samples: list[float]) -> dict[str, float | int]:
    summary = _summarize_latency_ms(samples)
    return {
        "samples": summary.samples,
        "median_ms": summary.median_ms,
        "p95_ms": summary.p95_ms,
    }


def _write_raw_measurement(
    path: Path,
    *,
    environment_id: str,
    top_k: int,
    repeats: int,
    cases: list[RetrievalCase],
    samples: list[dict],
    stage_samples: dict[str, list[float]],
) -> None:
    """중앙값과 p95를 다시 계산할 수 있는 개별 표본을 JSON으로 보존한다."""
    payload = {
        "schema_version": 1,
        "environment_id": environment_id,
        "dataset": {
            "path": str(RETRIEVAL_SET.relative_to(EVAL_DIR.parent)),
            "sha256": hashlib.sha256(RETRIEVAL_SET.read_bytes()).hexdigest(),
            "cases": len(cases),
            "graded_cases": sum(not case.expect_empty for case in cases),
        },
        "top_k": top_k,
        "repeats": repeats,
        "warmup_samples": len(cases),
        "samples": samples,
        "summary": {
            "total": _summary_payload([sample["total_ms"] for sample in samples]),
            "stages": {
                name: _summary_payload(values)
                for name, values in stage_samples.items()
                if "." not in name
            },
            "paths": {
                name: _summary_payload(values)
                for name, values in stage_samples.items()
                if "." in name
            },
        },
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _load_cases(path: Path = RETRIEVAL_SET) -> list[RetrievalCase]:
    """YAML을 최소한으로 읽는다.

    pyyaml을 의존성에 넣지 않으려고 직접 파싱한다. 평가셋 형식이 단순하고
    고정돼 있어 범용 파서가 필요 없다 — 형식이 복잡해지면 그때 넣는다.
    """
    text = path.read_text(encoding="utf-8")
    body = text.split("\ncases:", 1)[1]
    cases: list[RetrievalCase] = []
    cur: dict = {}
    for raw in body.splitlines():
        line = raw.rstrip()
        if re.match(r"^\s*#", line) or not line.strip():
            continue
        if re.match(r"^\s*-\s+id:", line):
            if cur:
                cases.append(_to_case(cur))
            cur = {"id": line.split("id:", 1)[1].strip()}
            continue
        m = re.match(r"^\s+(\w+):\s*(.*)$", line)
        if m and cur:
            k, v = m.group(1), m.group(2).strip()
            if k in ("why", "corpus_note") or v == "|":
                continue
            cur[k] = v
    if cur:
        cases.append(_to_case(cur))
    return cases


def _minimum_recall(path: Path = RETRIEVAL_SET, *, top_k: int) -> float | None:
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"^min_recall_at_{top_k}:\s*([0-9.]+)\s*$", text, re.MULTILINE)
    return float(match.group(1)) if match else None


def _to_case(d: dict) -> RetrievalCase:
    raw = d.get("expect_title_contains", "[]")
    titles = [t.strip() for t in raw.strip("[]").split(",") if t.strip()]
    ticker = d.get("ticker", "null").strip('"')
    return RetrievalCase(
        id=d["id"],
        query=d.get("query", ""),
        ticker=None if ticker in ("null", "") else ticker,
        expect_title_contains=titles,
        expect_empty=d.get("expect_empty", "false").lower() == "true",
    )


async def run_retrieval(
    top_k: int = 5,
    *,
    repeats: int = 5,
    raw_json: Path | None = None,
    environment_id: str | None = None,
) -> int:
    from app.core.db import engine
    from app.rag.embedding import NullEmbedder, get_embedder
    from app.rag.search import SearchTrace, search_with_vector

    if repeats < 1:
        raise ValueError("검색 반복 횟수는 1 이상이어야 한다")
    if raw_json is not None and not environment_id:
        raise ValueError("원자료 JSON에는 환경 식별자가 필요하다")
    if isinstance(get_embedder(), NullEmbedder):
        print("임베딩 키가 없어 검색 평가를 건너뛴다. GMS_KEY를 설정하라.")
        return 0

    cases = _load_cases()
    vectors = await asyncio.to_thread(get_embedder().embed, [case.query for case in cases])
    hits = graded = 0
    search_latencies_ms: list[float] = []
    stage_latencies_ms: dict[str, list[float]] = {}
    case_latencies_ms: dict[str, list[float]] = {case.id: [] for case in cases}
    first_results: dict[str, list[dict]] = {}
    raw_samples: list[dict] = []
    try:
        for c, vector in zip(cases, vectors, strict=True):
            if vector is None:
                print(f"  [FAIL] {c.id:<22} 질의 임베딩 실패")
                return 1

        print(f"워밍업: {len(cases)}질의 1회 (지연 표본에서 제외)")
        for c, vector in zip(cases, vectors, strict=True):
            await search_with_vector(c.query, vector, top_k=top_k, ticker=c.ticker)

        for repeat_index in range(repeats):
            for c, vector in zip(cases, vectors, strict=True):
                started_at = perf_counter()
                trace = SearchTrace()
                found = await search_with_vector(
                    c.query, vector, top_k=top_k, ticker=c.ticker, trace=trace
                )
                elapsed_ms = (perf_counter() - started_at) * 1000
                search_latencies_ms.append(elapsed_ms)
                accounted_ms = sum(
                    trace.elapsed_ms.get(stage, 0.0)
                    for stage in (
                        "session_acquire",
                        "db_execute",
                        "result_materialize",
                        "session_release",
                        "result_fusion",
                    )
                )
                trace.add("unclassified", max(0.0, elapsed_ms - accounted_ms))
                for stage, stage_ms in trace.elapsed_ms.items():
                    stage_latencies_ms.setdefault(stage, []).append(stage_ms)
                for stage, stage_ms in trace.path_elapsed_ms.items():
                    stage_latencies_ms.setdefault(stage, []).append(stage_ms)
                case_latencies_ms[c.id].append(elapsed_ms)
                raw_samples.append(
                    {
                        "case_id": c.id,
                        "repeat": repeat_index + 1,
                        "total_ms": elapsed_ms,
                        "stages_ms": trace.elapsed_ms,
                        "paths_ms": trace.path_elapsed_ms,
                    }
                )
                if repeat_index == 0:
                    first_results[c.id] = found

        print(
            f"측정: {len(cases)}질의 × {repeats}회"
            f" = {len(search_latencies_ms)}건"
        )
        for c in cases:
            found = first_results[c.id]
            case_latency = _summarize_latency_ms(case_latencies_ms[c.id])
            titles = " | ".join(h["title"] for h in found)
            if c.expect_empty:
                # 오탐 관찰용. 지금은 top-k만 쓰므로 항상 무언가 나온다.
                print(
                    f"  [관찰] {c.id:<22} 상위 {len(found)}건"
                    f" · 중앙값 {case_latency.median_ms:.1f} ms — {titles[:60]}"
                )
                continue
            graded += 1
            ok = any(
                any(want in h["title"] for want in c.expect_title_contains) for h in found
            )
            hits += ok
            print(
                f"  [{'HIT ' if ok else 'MISS'}] {c.id:<22}"
                f" 중앙값 {case_latency.median_ms:.1f} ms · {titles[:60]}"
            )
        if graded:
            recall = hits / graded
            minimum = _minimum_recall(top_k=top_k)
            gate = f" · 최소 {minimum:.3f}" if minimum is not None else ""
            print(f"\nRecall@{top_k}: {hits}/{graded} = {recall:.3f}{gate}")
            latency = _summarize_latency_ms(search_latencies_ms)
            print(
                f"검색 지연 ({latency.samples}건): 중앙값 {latency.median_ms:.1f} ms"
                f" · p95(nearest-rank) {latency.p95_ms:.1f} ms"
            )
            print("검색 내부 구간 (호출당 합계):")
            labels = {
                "session_acquire": "세션·커넥션 획득",
                "db_execute": "DB 왕복·실행",
                "result_materialize": "결과 변환",
                "session_release": "세션 반환",
                "result_fusion": "RRF 융합",
                "unclassified": "그 밖의 파이썬 구간",
            }
            for stage, label in labels.items():
                samples = stage_latencies_ms.get(stage)
                if not samples:
                    continue
                stage_latency = _summarize_latency_ms(samples)
                print(
                    f"  {label:<18} 중앙값 {stage_latency.median_ms:.1f} ms"
                    f" · p95 {stage_latency.p95_ms:.1f} ms"
                    f" · n={stage_latency.samples}"
                )
            print("DB 왕복·실행 세부:")
            for path, label in (
                ("dense", "밀집 벡터"),
                ("title", "제목 검색"),
                ("lexical", "어휘 검색"),
            ):
                samples = stage_latencies_ms.get(f"{path}.db_execute")
                if not samples:
                    continue
                stage_latency = _summarize_latency_ms(samples)
                print(
                    f"  {label:<18} 중앙값 {stage_latency.median_ms:.1f} ms"
                    f" · p95 {stage_latency.p95_ms:.1f} ms"
                    f" · n={stage_latency.samples}"
                )
            if raw_json is not None:
                _write_raw_measurement(
                    raw_json,
                    environment_id=environment_id or "",
                    top_k=top_k,
                    repeats=repeats,
                    cases=cases,
                    samples=raw_samples,
                    stage_samples=stage_latencies_ms,
                )
                print(f"원자료 JSON: {raw_json}")
            if minimum is not None and recall < minimum:
                print("검색 품질 기준을 통과하지 못했다.")
                return 1
    finally:
        await engine.dispose()
    return 0


def run_metrics_selfcheck() -> int:
    """지표가 실제로 위반을 잡는지 확인한다.

    통과만 하는 지표는 쓸모가 없다. 일부러 어긴 입력을 넣어 걸리는지 본다.
    """
    from app.core.enums import MetricSource, Unit
    from app.core.schemas import Section, Segment
    from eval.metrics import groundedness, numerical_accuracy, portfolio_accuracy

    ok = True

    good = Section.from_segments(
        [
            Segment.text("반도체 관련 자산이 포트폴리오의 "),
            Segment.metric("42.3%", 0.423, MetricSource.RISK_ENGINE, unit=Unit.RATIO),
            Segment.text("를 차지합니다."),
        ]
    )
    r = numerical_accuracy(good, {"42.3%": 0.423})
    print(" ", r)
    ok &= r.passed

    bad = Section(text="반도체 비중이 42.3%이고 종목은 3개입니다.")
    r = numerical_accuracy(bad, {})
    print(" ", r)
    ok &= not r.passed  # 잡아야 정상

    drift = Section.from_segments(
        [Segment.metric("42.3%", 0.999, MetricSource.RISK_ENGINE, unit=Unit.RATIO)]
    )
    r = numerical_accuracy(drift, {"42.3%": 0.423})
    print(" ", r)
    ok &= not r.passed

    r = groundedness(Section(text="회사는 신규 계약을 체결했습니다."), set())
    print(" ", r)
    ok &= not r.passed

    r = groundedness(Section(text="회사는 신규 계약을 체결했습니다.[^cit_1]"), {"cit_1"})
    print(" ", r)
    ok &= r.passed

    r = portfolio_accuracy(
        Section.from_segments(
            [Segment.metric("41.7%", 0.417, MetricSource.PORTFOLIO_ENGINE, unit=Unit.RATIO)]
        ),
        {"005930": 0.417},
    )
    print(" ", r)
    ok &= r.passed

    r = portfolio_accuracy(
        Section.from_segments(
            [Segment.metric("41.7%", 0.417, MetricSource.PORTFOLIO_ENGINE, unit=Unit.RATIO)]
        ),
        {"005930": 0.180},
    )
    print(" ", r)
    ok &= not r.passed

    print("\n지표 자체 점검:", "통과" if ok else "실패")
    return 0 if ok else 1


def main() -> int:
    p = argparse.ArgumentParser(description="평가 실행")
    p.add_argument("--retrieval", action="store_true", help="검색 정확도 (키 필요)")
    p.add_argument("--metrics", action="store_true", help="지표 자체 점검")
    p.add_argument("--top-k", type=int, default=5)
    p.add_argument("--repeat", type=int, default=5, help="검색 질의 반복 횟수 (기본 5)")
    p.add_argument("--raw-json", type=Path, help="개별 지연 표본과 요약을 저장할 JSON 경로")
    p.add_argument("--environment-id", help="Pod·이미지·평가 코드로 구성한 실행 환경 식별자")
    p.add_argument("--list", action="store_true", help="평가셋 요약")
    p.add_argument("--feedback", action="store_true", help="프롬프트 버전별 피드백 통계")
    p.add_argument("--days", type=int, default=30, help="피드백 집계 기간 (기본 30일)")
    p.add_argument("--json", action="store_true", help="피드백 통계를 JSON으로 출력")
    p.add_argument("--baseline", help="비교할 이전 prompt_version")
    p.add_argument("--candidate", help="비교할 새 prompt_version")
    a = p.parse_args()

    if a.list:
        cases = _load_cases()
        print(f"검색 평가셋 {len(cases)}건")
        for c in cases:
            tag = "빈 결과 기대" if c.expect_empty else ", ".join(c.expect_title_contains)
            print(f"  {c.id:<22} {c.query[:34]:<36} → {tag[:34]}")
        return 0
    if a.metrics:
        return run_metrics_selfcheck()
    if a.feedback:
        from eval.feedback import (
            aggregate,
            as_dict,
            comparisons,
            load,
            render,
            render_comparisons,
        )

        stats = aggregate(asyncio.run(load(a.days)))
        if bool(a.baseline) != bool(a.candidate):
            p.error("--baseline과 --candidate는 함께 지정해야 한다")
        if a.baseline and a.candidate:
            print(render_comparisons(comparisons(stats, a.baseline, a.candidate)))
            return 0
        print(
            json.dumps([as_dict(item) for item in stats], ensure_ascii=False, indent=2)
            if a.json
            else render(stats)
        )
        return 0
    if a.retrieval:
        if a.repeat < 1:
            p.error("--repeat는 1 이상이어야 한다")
        if a.raw_json and not a.environment_id:
            p.error("--raw-json에는 --environment-id가 필요하다")
        return asyncio.run(
            run_retrieval(
                a.top_k,
                repeats=a.repeat,
                raw_json=a.raw_json,
                environment_id=a.environment_id,
            )
        )
    p.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
