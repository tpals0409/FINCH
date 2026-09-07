from __future__ import annotations

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
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
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

    assert await eval_run.run_retrieval(repeats=2) == 0
    output = capsys.readouterr().out
    assert search_calls == 3
    assert "워밍업: 1질의 1회 (지연 표본에서 제외)" in output
    assert "측정: 1질의 × 2회 = 2건" in output
    assert "Recall@5: 1/1 = 1.000" in output
    assert "검색 지연 (2건): 중앙값 18.0 ms · p95(nearest-rank) 24.0 ms" in output
