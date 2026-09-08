"""HTTP 요청 전체에서 공유하는 단조 시계 시작점."""

from __future__ import annotations

from contextvars import ContextVar, Token
from time import perf_counter_ns

_started_at_ns: ContextVar[int | None] = ContextVar(
    "request_started_at_ns", default=None
)


def begin_request() -> Token[int | None]:
    """현재 비동기 요청의 시작점을 기록한다."""
    return _started_at_ns.set(perf_counter_ns())


def reset_request(token: Token[int | None]) -> None:
    """요청이 끝나면 이전 문맥을 복원한다."""
    _started_at_ns.reset(token)


def elapsed_ms() -> int | None:
    """활성 요청의 경과 시간을 정수 밀리초로 돌려준다."""
    started_at = _started_at_ns.get()
    if started_at is None:
        return None
    return max(0, round((perf_counter_ns() - started_at) / 1_000_000))
