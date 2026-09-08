"""전일 실제 종가 스냅샷을 날짜·시장당 한 번의 KRX OpenAPI 호출로 적재한다.

위험 엔진의 수정주가 시계열은 ``ingest.prices``가 ``price_daily``에 계속
적재한다. 이 모듈은 화면 등락률과 거래대금 순위의 원천만 별도 테이블에 둔다.

    python -m ingest.price_snapshots
    python -m ingest.price_snapshots --date 2026-09-07
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import re
from datetime import date, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionFactory, engine
from app.core.models import Instrument, PriceSnapshotDaily
from ingest.krx import HTTP_TIMEOUT, _int, _latest_stock_payload

logger = logging.getLogger("ingest.price_snapshots")

SNAPSHOT_VALUE_FIELDS = {"TDD_CLSPRC", "ACC_TRDVOL", "ACC_TRDVAL"}


def _parse_date(value: str) -> date:
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is None:
        raise argparse.ArgumentTypeError("날짜는 YYYY-MM-DD 형식이어야 합니다")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("날짜는 YYYY-MM-DD 형식이어야 합니다") from exc


def _to_rows(
    trade_date: date,
    payload: list[dict],
    known_tickers: set[str],
) -> tuple[list[dict], int, int]:
    """KRX 행을 FK·거래정지 규칙으로 걸러 DB 행으로 바꾼다."""
    rows: dict[tuple[str, date], dict] = {}
    unknown = halted = 0
    for values in payload:
        missing = {"BAS_DD", "ISU_CD"} - values.keys()
        if missing:
            raise ValueError(f"KRX 스냅샷 응답 필드 누락: {', '.join(sorted(missing))}")

        ticker = str(values["ISU_CD"]).strip()
        if ticker not in known_tickers:
            unknown += 1
            continue
        missing = SNAPSHOT_VALUE_FIELDS - values.keys()
        if missing:
            raise ValueError(f"KRX 스냅샷 응답 필드 누락: {', '.join(sorted(missing))}")
        payload_date = _parse_krx_date(values["BAS_DD"])
        if payload_date != trade_date:
            raise ValueError(
                f"KRX 기준일 불일치: 요청={trade_date} 응답={payload_date}"
            )
        close = _int(values["TDD_CLSPRC"])
        if close is None or close <= 0:
            halted += 1
            continue
        rows.setdefault(
            (ticker, trade_date),
            {
                "ticker": ticker,
                "trade_date": trade_date,
                "close": close,
                # 종가는 양수인데 체결이 없으면 두 값은 0이다. 결측과 다르므로 보존한다.
                "volume": _int(values["ACC_TRDVOL"]),
                "trade_value": _int(values["ACC_TRDVAL"]),
            },
        )
    return list(rows.values()), unknown, halted


def _parse_krx_date(value: object) -> date:
    text = str(value).strip()
    if re.fullmatch(r"\d{8}", text) is None:
        raise ValueError(f"KRX 기준일 형식 오류: {text!r}")
    return date.fromisoformat(f"{text[:4]}-{text[4:6]}-{text[6:8]}")


async def _known_tickers(session: AsyncSession) -> set[str]:
    return set((await session.scalars(select(Instrument.ticker))).all())


async def _upsert(session: AsyncSession, rows: list[dict]) -> int:
    if not rows:
        return 0
    stmt = pg_insert(PriceSnapshotDaily).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker", "trade_date"],
        set_={
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
            "trade_value": stmt.excluded.trade_value,
        },
    )
    await session.execute(stmt)
    return len(rows)


async def ingest(*, requested_date: date | None = None) -> dict[str, int | str | None]:
    """하루치 스냅샷을 멱등 upsert하고 집계를 반환한다."""
    end = requested_date or date.today()
    candidates = [end - timedelta(days=offset) for offset in range(5)]
    stats: dict[str, int | str | None] = {
        "trade_date": None,
        "rows": 0,
        "unknown": 0,
        "halted": 0,
    }

    async with SessionFactory() as session:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            trade_date, payload = await _latest_stock_payload(client, candidates)
        if trade_date is None:
            logger.error("최근 5일 어디에도 KRX 전 종목 응답이 없어 적재를 중단함")
            return stats
        stats["trade_date"] = trade_date.isoformat()

        known = await _known_tickers(session)
        if not known:
            logger.warning("종목 마스터가 비어 있어 스냅샷을 적재하지 않음")
            return stats
        rows, unknown, halted = _to_rows(trade_date, payload, known)
        stats["unknown"] = unknown
        stats["halted"] = halted
        try:
            stats["rows"] = await _upsert(session, rows)
            await session.commit()
        except Exception:
            await session.rollback()
            raise

    return stats


async def _main() -> None:
    parser = argparse.ArgumentParser(description="실제 종가 일별 스냅샷 적재")
    parser.add_argument(
        "--date",
        type=_parse_date,
        help="기준일(YYYY-MM-DD). 해당일이 비었으면 최대 5일 전까지 탐색",
    )
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)-5s %(message)s"
    )
    from app.core.config import settings

    if not settings.krx_api_key:
        raise SystemExit("KRX_API_KEY가 비어 있다. .env를 확인할 것")
    try:
        stats = await ingest(requested_date=args.date)
        logger.info(
            "완료 — %s · 적재 %d행 · 마스터 밖 %d · 거래정지 %d",
            stats["trade_date"],
            stats["rows"],
            stats["unknown"],
            stats["halted"],
        )
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
