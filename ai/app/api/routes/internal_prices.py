"""백엔드가 AI 시세 원본을 읽는 내부 API."""

from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from app.api.deps import DbSession, InternalToken
from app.core.models import PriceSnapshotDaily

router = APIRouter(prefix="/internal/prices", tags=["internal-prices"])


class DailyCloseItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    stock_code: str = Field(serialization_alias="stockCode")
    close: int


class DailyCloseResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trade_date: date | None = Field(serialization_alias="tradeDate")
    items: list[DailyCloseItem]


@router.get("/daily-close", response_model=DailyCloseResponse)
async def get_daily_close(
    _auth: InternalToken,
    db: DbSession,
    requested_date: Annotated[date | None, Query(alias="date")] = None,
) -> DailyCloseResponse:
    """요청일 또는 가장 최근 거래일의 전 종목 종가를 돌려준다."""
    trade_date = requested_date
    if trade_date is None:
        trade_date = await db.scalar(select(func.max(PriceSnapshotDaily.trade_date)))

    if trade_date is None:
        return DailyCloseResponse(trade_date=None, items=[])

    rows = (
        await db.execute(
            select(PriceSnapshotDaily.ticker, PriceSnapshotDaily.close)
            .where(PriceSnapshotDaily.trade_date == trade_date)
            .order_by(PriceSnapshotDaily.ticker)
        )
    ).all()
    return DailyCloseResponse(
        trade_date=trade_date,
        items=[DailyCloseItem(stock_code=ticker, close=close) for ticker, close in rows],
    )
