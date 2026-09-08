"""백엔드용 일별 종가 내부 API 계약."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi.testclient import TestClient

from app.api.main import create_app
from app.core.config import settings
from app.core.db import get_session


class _Result:
    def __init__(self, rows: list[tuple[Any, ...]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[Any, ...]]:
        return self._rows


class _Session:
    def __init__(
        self,
        *,
        latest: date | None,
        rows: list[tuple[Any, ...]] | None = None,
    ) -> None:
        self.latest = latest
        self.rows = rows or []
        self.seen: list[str] = []
        self.params: list[dict[str, Any]] = []

    async def scalar(self, statement: Any) -> date | None:
        self.seen.append(str(statement))
        return self.latest

    async def execute(self, statement: Any) -> _Result:
        self.seen.append(str(statement))
        self.params.append(statement.compile().params)
        return _Result(self.rows)


def _client(session: _Session) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: session
    return TestClient(app)


def test_requested_date_returns_camel_case_contract(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    session = _Session(
        latest=date(2026, 9, 5),
        rows=[("000660", 286000), ("005930", 73500)],
    )

    response = _client(session).get(
        "/internal/prices/daily-close?date=2026-09-05",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "tradeDate": "2026-09-05",
        "items": [
            {"stockCode": "000660", "close": 286000},
            {"stockCode": "005930", "close": 73500},
        ],
    }
    assert len(session.seen) == 1, "날짜를 받으면 최신일 조회가 없어야 한다"


def test_omitted_date_uses_latest_trade_date(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    session = _Session(latest=date(2026, 9, 5), rows=[("005930", 73500)])

    response = _client(session).get(
        "/internal/prices/daily-close",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json()["tradeDate"] == "2026-09-05"
    assert len(session.seen) == 2


def test_requested_date_without_rows_is_not_an_error(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")

    response = _client(_Session(latest=None)).get(
        "/internal/prices/daily-close?date=2026-09-06",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json() == {"tradeDate": "2026-09-06", "items": []}


def test_empty_table_without_date_returns_nullable_trade_date(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")

    response = _client(_Session(latest=None)).get(
        "/internal/prices/daily-close",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json() == {"tradeDate": None, "items": []}


def test_internal_endpoint_requires_only_service_token(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    client = _client(_Session(latest=date(2026, 9, 5)))

    denied = client.get("/internal/prices/daily-close")
    accepted = client.get(
        "/internal/prices/daily-close",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert denied.status_code == 401
    assert accepted.status_code == 200


def _fixed_now() -> datetime:
    return datetime(2026, 9, 8, 14, 30, tzinfo=timezone(timedelta(hours=9)))


def test_candles_returns_public_contract_in_ascending_order(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    monkeypatch.setattr("app.api.routes.internal_prices.now_kst", _fixed_now)
    session = _Session(
        latest=None,
        rows=[
            (date(2026, 9, 4), 70000, 71000, 69000, 70500, 123456),
            (date(2026, 9, 7), 70500, 72000, 70000, 71500, 234567),
        ],
    )

    response = _client(session).get(
        "/internal/prices/005930/candles?period=1M",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "stockCode": "005930",
        "period": "1M",
        "interval": "DAY",
        "candles": [
            {
                "date": "2026-09-04",
                "open": 70000,
                "high": 71000,
                "low": 69000,
                "close": 70500,
                "volume": 123456,
            },
            {
                "date": "2026-09-07",
                "open": 70500,
                "high": 72000,
                "low": 70000,
                "close": 71500,
                "volume": 234567,
            },
        ],
    }
    assert "ORDER BY price_daily.trade_date" in session.seen[0]


def test_candle_periods_use_calendar_day_boundaries(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    monkeypatch.setattr("app.api.routes.internal_prices.now_kst", _fixed_now)

    for period, expected_start in (("1M", date(2026, 8, 9)), ("3M", date(2026, 6, 10)), ("1Y", date(2025, 9, 8))):
        session = _Session(latest=None)
        response = _client(session).get(
            f"/internal/prices/005930/candles?period={period}",
            headers={settings.internal_token_header: "s3cret"},
        )

        assert response.status_code == 200
        bound_values = {value for params in session.params for value in params.values()}
        assert expected_start in bound_values
        assert date(2026, 9, 8) in bound_values


def test_candles_empty_result_is_success(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    monkeypatch.setattr("app.api.routes.internal_prices.now_kst", _fixed_now)

    response = _client(_Session(latest=None)).get(
        "/internal/prices/005930/candles?period=1Y",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "stockCode": "005930",
        "period": "1Y",
        "interval": "DAY",
        "candles": [],
    }


def test_candles_require_service_token(monkeypatch) -> None:
    monkeypatch.setattr(settings, "backend_service_token", "s3cret")
    client = _client(_Session(latest=None))

    denied = client.get("/internal/prices/005930/candles?period=1M")
    accepted = client.get(
        "/internal/prices/005930/candles?period=1M",
        headers={settings.internal_token_header: "s3cret"},
    )

    assert denied.status_code == 401
    assert accepted.status_code == 200
