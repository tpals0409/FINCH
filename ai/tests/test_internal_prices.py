"""백엔드용 일별 종가 내부 API 계약."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi.testclient import TestClient

from app.api.main import create_app
from app.core.config import settings
from app.core.db import get_session


class _Result:
    def __init__(self, rows: list[tuple[str, int]]) -> None:
        self._rows = rows

    def all(self) -> list[tuple[str, int]]:
        return self._rows


class _Session:
    def __init__(
        self,
        *,
        latest: date | None,
        rows: list[tuple[str, int]] | None = None,
    ) -> None:
        self.latest = latest
        self.rows = rows or []
        self.seen: list[str] = []

    async def scalar(self, statement: Any) -> date | None:
        self.seen.append(str(statement))
        return self.latest

    async def execute(self, statement: Any) -> _Result:
        self.seen.append(str(statement))
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
