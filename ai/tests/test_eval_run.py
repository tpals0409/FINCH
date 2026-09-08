from __future__ import annotations

import json
from pathlib import Path

import pytest

import eval.run as eval_run
from eval.run import RetrievalCase, _summarize_latency_ms


def test_검색_지연은_중앙값과_nearest_rank_p95로_요약한다() -> None:
    summary = _summarize_latency_ms([float(value) for value in range(1, 21)])

    assert summary.samples == 20
    assert summary.median_ms == 10.5
    assert summary.p95_ms == 19.0


def test_검색_지연_표본이_없으면_실패한다() -> None:
    with pytest.raises(ValueError, match="지연 표본이 비어 있다"):
        _summarize_latency_ms([])


@pytest.mark.asyncio
async def test_검색_평가는_검색_호출_지연을_결과에_출력한다(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
    tmp_path: Path,
) -> None:
    class FakeEmbedder:
        def embed(self, texts: list[str]) -> list[list[float]]:
            return [[0.0] for _ in texts]

    class FakeEngine:
        async def dispose(self) -> None:
            pass

    search_calls = 0

    async def fake_search(*args, **kwargs) -> list[dict[str, str]]:
        nonlocal search_calls
        search_calls += 1
        if trace := kwargs.get("trace"):
            trace.add("session_acquire", 2.0)
            trace.add("db_execute", 8.0)
            trace.add("result_materialize", 1.0)
            trace.add("session_release", 0.5)
            trace.add("result_fusion", 0.25)
            trace.path_elapsed_ms["dense.db_execute"] = 3.0
        return [{"title": "주식소각결정"}]

    monkeypatch.setattr(
        eval_run,
        "_load_cases",
        lambda: [
            RetrievalCase(
                id="treasury-cancel",
                query="자기주식을 소각하기로 한 곳이 있나요?",
                ticker=None,
                expect_title_contains=["주식소각결정"],
            )
        ],
    )
    monkeypatch.setattr("app.rag.embedding.get_embedder", lambda: FakeEmbedder())
    monkeypatch.setattr("app.rag.search.search_with_vector", fake_search)
    monkeypatch.setattr("app.core.db.engine", FakeEngine())
    times = iter([10.0, 10.012, 20.0, 20.024])
    monkeypatch.setattr(eval_run, "perf_counter", lambda: next(times))

    raw_json = tmp_path / "retrieval.json"
    assert (
        await eval_run.run_retrieval(
            repeats=2,
            raw_json=raw_json,
            environment_id="pod=test;image=sha-test;evaluator=test-head",
        )
        == 0
    )
    output = capsys.readouterr().out
    assert search_calls == 3
    assert "워밍업: 1질의 1회 (지연 표본에서 제외)" in output
    assert "측정: 1질의 × 2회 = 2건" in output
    assert "Recall@5: 1/1 = 1.000" in output
    assert "검색 지연 (2건): 중앙값 18.0 ms · p95(nearest-rank) 24.0 ms" in output
    assert "세션·커넥션 획득" in output
    assert "중앙값 2.0 ms · p95 2.0 ms · n=2" in output
    assert "DB 왕복·실행" in output
    assert "중앙값 8.0 ms · p95 8.0 ms · n=2" in output
    assert "그 밖의 파이썬 구간" in output
    raw = json.loads(raw_json.read_text(encoding="utf-8"))
    assert raw["environment_id"] == "pod=test;image=sha-test;evaluator=test-head"
    assert raw["repeats"] == 2
    assert raw["warmup_samples"] == 1
    assert [sample["total_ms"] for sample in raw["samples"]] == pytest.approx([12.0, 24.0])
    assert raw["summary"]["total"]["samples"] == 2
    assert raw["summary"]["total"]["median_ms"] == pytest.approx(18.0)
    assert raw["summary"]["total"]["p95_ms"] == pytest.approx(24.0)
    assert raw["summary"]["stages"]["db_execute"]["median_ms"] == 8.0
    assert raw["summary"]["paths"]["dense.db_execute"]["median_ms"] == 3.0


@pytest.mark.asyncio
async def test_원자료_JSON은_환경_식별자가_필수다() -> None:
    with pytest.raises(ValueError, match="환경 식별자가 필요하다"):
        await eval_run.run_retrieval(raw_json=Path("raw.json"))
