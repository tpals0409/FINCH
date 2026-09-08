"""실제 종가 스냅샷 일괄 적재 계약."""

from __future__ import annotations

import argparse
from datetime import date
from typing import Any

import pytest
from sqlalchemy.dialects import postgresql

from ingest.price_snapshots import _parse_date, _to_rows, _upsert


def _row(
    ticker: str,
    close: str,
    *,
    day: str = "20260907",
    volume: str = "1000",
    trade_value: str = "73500000",
) -> dict:
    return {
        "BAS_DD": day,
        "ISU_CD": ticker,
        "TDD_CLSPRC": close,
        "ACC_TRDVOL": volume,
        "ACC_TRDVAL": trade_value,
    }


def test_rows_keep_known_positive_close_and_trade_value() -> None:
    rows, unknown, halted = _to_rows(
        date(2026, 9, 7),
        [
            _row("005930", "73,500"),
            _row("000660", "0"),
            _row("999999", "1,050"),
        ],
        {"005930", "000660"},
    )

    assert rows == [
        {
            "ticker": "005930",
            "trade_date": date(2026, 9, 7),
            "close": 73500,
            "volume": 1000,
            "trade_value": 73_500_000,
        }
    ]
    assert unknown == 1
    assert halted == 1


def test_ticker_stays_a_six_character_string() -> None:
    rows, _, _ = _to_rows(
        date(2026, 9, 7), [_row("005930", "73500")], {"005930"}
    )
    assert rows[0]["ticker"] == "005930"


def test_zero_volume_and_trade_value_are_valid_when_close_is_positive() -> None:
    rows, _, halted = _to_rows(
        date(2026, 9, 7),
        [_row("005930", "73500", volume="0", trade_value="0")],
        {"005930"},
    )
    assert rows[0]["volume"] == 0
    assert rows[0]["trade_value"] == 0
    assert halted == 0


def test_missing_trade_value_field_fails_instead_of_writing_null() -> None:
    payload = _row("005930", "73500")
    del payload["ACC_TRDVAL"]
    with pytest.raises(ValueError, match="ACC_TRDVAL"):
        _to_rows(date(2026, 9, 7), [payload], {"005930"})


def test_bad_trade_date_is_rejected() -> None:
    with pytest.raises(ValueError, match="기준일 형식"):
        _to_rows(
            date(2026, 9, 7),
            [_row("005930", "73500", day="2026-09-07")],
            {"005930"},
        )


def test_duplicate_market_rows_collapse_to_one_key() -> None:
    rows, _, _ = _to_rows(
        date(2026, 9, 7),
        [_row("005930", "73500"), _row("005930", "99999")], {"005930"}
    )
    assert len(rows) == 1
    assert rows[0]["close"] == 73500


def test_payload_date_must_match_requested_trade_date() -> None:
    with pytest.raises(ValueError, match="기준일 불일치"):
        _to_rows(
            date(2026, 9, 8), [_row("005930", "73500")], {"005930"}
        )


def test_invalid_cli_date_is_rejected() -> None:
    with pytest.raises(argparse.ArgumentTypeError, match="YYYY-MM-DD"):
        _parse_date("20260907")


class _CaptureSession:
    def __init__(self) -> None:
        self.statements: list[Any] = []

    async def execute(self, statement: Any) -> None:
        self.statements.append(statement)


@pytest.mark.asyncio
async def test_upsert_is_idempotent_on_ticker_and_trade_date() -> None:
    session = _CaptureSession()
    row = {
        "ticker": "005930",
        "trade_date": date(2026, 9, 7),
        "close": 73500,
        "volume": 1000,
        "trade_value": 73_500_000,
    }

    assert await _upsert(session, [row]) == 1  # type: ignore[arg-type]
    sql = str(
        session.statements[0].compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )

    assert "ON CONFLICT (ticker, trade_date) DO UPDATE" in sql
    assert "trade_value = excluded.trade_value" in sql
