"""검색 계측은 평가 실행에서만 세션 내부 구간을 나눈다."""

from __future__ import annotations

from typing import Any

import pytest

import app.rag.search as search


class _Result:
    def all(self) -> list[str]:
        return ["row"]


class _TimedSession:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def connection(self) -> None:
        self.calls.append("connection")

    async def execute(self, _stmt: Any) -> _Result:
        self.calls.append("execute")
        return _Result()

    async def close(self) -> None:
        self.calls.append("close")


@pytest.mark.asyncio
async def test_계측_요청은_DB_세션_구간을_각각_남긴다(monkeypatch) -> None:
    session = _TimedSession()
    monkeypatch.setattr(search, "SessionFactory", lambda: session)
    times = iter([0.0, 0.002, 1.0, 1.008, 2.0, 2.001, 3.0, 3.0005])
    monkeypatch.setattr(search, "perf_counter", lambda: next(times))
    trace = search.SearchTrace()

    assert await search._run("statement", trace=trace, path="dense") == ["row"]
    assert session.calls == ["connection", "execute", "close"]
    assert trace.elapsed_ms["session_acquire"] == pytest.approx(2.0)
    assert trace.elapsed_ms["db_execute"] == pytest.approx(8.0)
    assert trace.elapsed_ms["result_materialize"] == pytest.approx(1.0)
    assert trace.elapsed_ms["session_release"] == pytest.approx(0.5)
    assert trace.path_elapsed_ms["dense.db_execute"] == pytest.approx(8.0)
