"""시세 적재 변환 로직 테스트.

네트워크와 DB 없이 도는 것만 둔다. pykrx 호출은 목으로 대체한다.
"""

from __future__ import annotations

from datetime import date

import httpx
import pandas as pd
import pytest

from ingest.prices import (
    COLUMN_MAP,
    _auto_status,
    _fetch_price_universe,
    _latest_market_date,
    _require_trade_date,
    _target_tickers,
    _to_rows,
    _yyyymmdd,
)


@pytest.mark.parametrize(
    ("source", "stored", "target", "expected"),
    [
        (date(2026, 8, 22), None, date(2026, 8, 22), "no_session"),
        (date(2026, 8, 18), date(2026, 8, 18), date(2026, 8, 20), "pending_source"),
        (date(2026, 8, 20), date(2026, 8, 19), date(2026, 8, 21), "loaded"),
        (date(2026, 8, 6), date(2026, 8, 6), date(2026, 8, 10), "pending_source"),
    ],
)
def test_auto_status_distinguishes_weekend_and_source_delay(source, stored, target, expected):
    assert _auto_status(source_date=source, stored_date=stored, today=target) == expected


def _df(rows: list[tuple]) -> pd.DataFrame:
    """pykrx가 돌려주는 모양 그대로 만든다 — 한글 컬럼, 날짜 인덱스."""
    idx = pd.to_datetime([r[0] for r in rows])
    return pd.DataFrame(
        {
            "시가": [r[1] for r in rows],
            "고가": [r[2] for r in rows],
            "저가": [r[3] for r in rows],
            "종가": [r[4] for r in rows],
            "거래량": [r[5] for r in rows],
            "등락률": [0.0] * len(rows),
        },
        index=idx,
    )


def test_yyyymmdd() -> None:
    assert _yyyymmdd(date(2026, 8, 19)) == "20260819"


def test_column_map_covers_model_fields() -> None:
    assert set(COLUMN_MAP.values()) == {"open", "high", "low", "close", "volume"}


def test_converts_basic_rows() -> None:
    df = _df([("2026-08-18", 100, 110, 95, 105, 1000)])
    rows = _to_rows("005930", df)
    assert rows == [
        {
            "ticker": "005930",
            "trade_date": date(2026, 8, 18),
            "open": 100,
            "high": 110,
            "low": 95,
            "close": 105,
            "volume": 1000,
            "trade_value": None,
        }
    ]


def test_ticker_stays_a_six_char_string() -> None:
    """정수로 다루면 선행 0이 사라진다. 모델 제약에 걸려 즉시 실패한다."""
    rows = _to_rows("005930", _df([("2026-08-18", 1, 1, 1, 1, 1)]))
    assert rows[0]["ticker"] == "005930"
    assert len(rows[0]["ticker"]) == 6


def test_halted_days_are_dropped_not_zero_filled() -> None:
    """거래정지일에 0 수익률이 들어가면 변동성이 과소 추정된다.

    엔진 산식 §6.1 — 직전가 유지가 아니라 해당 날짜를 제외한다.
    """
    df = _df(
        [
            ("2026-08-17", 100, 100, 100, 100, 500),
            ("2026-08-18", 0, 0, 0, 0, 0),      # 거래정지
            ("2026-08-19", 110, 110, 110, 110, 700),
        ]
    )
    rows = _to_rows("005930", df)
    assert [r["trade_date"] for r in rows] == [date(2026, 8, 17), date(2026, 8, 19)]


def test_nan_close_is_dropped() -> None:
    df = _df([("2026-08-18", 100, 110, 95, 105, 1000)])
    df.loc[df.index[0], "종가"] = float("nan")
    assert _to_rows("005930", df) == []


def test_nan_in_optional_columns_becomes_none() -> None:
    """종가만 있으면 행을 살린다. 나머지는 null로 둔다."""
    df = _df([("2026-08-18", 100, 110, 95, 105, 1000)])
    df.loc[df.index[0], "거래량"] = float("nan")
    rows = _to_rows("005930", df)
    assert len(rows) == 1
    assert rows[0]["volume"] is None
    assert rows[0]["close"] == 105


def test_close_gate_requires_the_requested_trade_date() -> None:
    rows = _to_rows("005930", _df([("2026-08-18", 1, 1, 1, 1, 1)]))

    with pytest.raises(ValueError, match="기준일 2026-08-19"):
        _require_trade_date(rows, date(2026, 8, 19))


def test_close_gate_accepts_the_requested_trade_date() -> None:
    rows = _to_rows("005930", _df([("2026-08-19", 1, 1, 1, 1, 1)]))

    _require_trade_date(rows, date(2026, 8, 19))


@pytest.mark.asyncio
async def test_latest_market_date_uses_krx_response(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_latest_payload(client, candidates):
        assert len(candidates) == 5
        return date(2026, 8, 19), []

    monkeypatch.setattr("ingest.krx._latest_stock_payload", fake_latest_payload)

    assert await _latest_market_date() == date(2026, 8, 19)


@pytest.mark.parametrize("empty", [None, pd.DataFrame()])
def test_empty_input_returns_no_rows(empty) -> None:
    """상장 직후 종목은 구간에 데이터가 없다. 오류가 아니라 빈 결과다."""
    assert _to_rows("005930", empty) == []


class _ScalarsResult:
    def __init__(self, values: list[str]) -> None:
        self._values = values

    def all(self) -> list[str]:
        return self._values


class _SessionStub:
    def __init__(self, values: list[str]) -> None:
        self._values = values
        self.statement = None

    async def scalars(self, statement):
        self.statement = statement
        return _ScalarsResult(self._values)


@pytest.mark.asyncio
async def test_existing_only_targets_distinct_price_daily_tickers() -> None:
    session = _SessionStub(["000660", "005930"])

    targets = await _target_tickers(
        session, None, None, existing_only=True  # type: ignore[arg-type]
    )

    assert targets == ["000660", "005930"]
    sql = str(session.statement)
    assert "SELECT DISTINCT price_daily.ticker" in sql
    assert "ORDER BY price_daily.ticker" in sql
    assert "instruments" not in sql


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("tickers", "limit"),
    [(["005930"], None), (None, 30)],
)
async def test_existing_only_rejects_other_target_modes(tickers, limit) -> None:
    session = _SessionStub([])

    with pytest.raises(ValueError, match="함께 쓸 수 없다"):
        await _target_tickers(
            session, tickers, limit, existing_only=True  # type: ignore[arg-type]
        )


def test_price_universe_follows_cursor_and_preserves_as_of() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        if request.url.params.get("cursor") is None:
            return httpx.Response(
                200,
                json={
                    "items": [{"stockCode": "000660"}],
                    "nextCursor": "000660",
                    "hasNext": True,
                    "asOf": "2026-09-09T10:00:00+09:00",
                },
            )
        return httpx.Response(
            200,
            json={
                "items": [{"stockCode": "005930"}],
                "nextCursor": None,
                "hasNext": False,
                "asOf": "2026-09-09T10:00:00+09:00",
            },
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        universe = _fetch_price_universe(client)

    assert universe.tickers == ("000660", "005930")
    assert universe.as_of == "2026-09-09T10:00:00+09:00"
    assert [request.url.params.get("cursor") for request in seen] == [None, "000660"]


def test_empty_price_universe_fails_without_touching_existing_data() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "items": [],
                "nextCursor": None,
                "hasNext": False,
                "asOf": "2026-09-09T10:00:00+09:00",
            },
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(RuntimeError, match="비어 있다"):
            _fetch_price_universe(client)


def test_price_universe_http_error_is_propagated() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(httpx.HTTPStatusError):
            _fetch_price_universe(client)
