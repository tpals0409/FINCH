"""백엔드가 AI 시세 원본을 읽는 내부 API."""

from __future__ import annotations

from datetime import date, timedelta
from enum import StrEnum
from typing import Annotated

from fastapi import APIRouter, Path, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select

from app.api.deps import DbSession, InternalToken
from app.core.models import PriceDaily, PriceSnapshotDaily
from app.core.schemas import now_kst

router = APIRouter(prefix="/internal/prices", tags=["internal-prices"])


class DailyCloseItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    stock_code: str = Field(serialization_alias="stockCode")
    close: int


class DailyCloseResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trade_date: date | None = Field(serialization_alias="tradeDate")
    items: list[DailyCloseItem]


class CandlePeriod(StrEnum):
    M1 = "1M"
    M3 = "3M"
    Y1 = "1Y"

    def start_date(self, today: date) -> date:
        days = {self.M1: 30, self.M3: 90, self.Y1: 365}
        return today - timedelta(days=days[self])


class CandleItem(BaseModel):
    date: date
    open: int
    high: int
    low: int
    close: int
    volume: int


class CandlesResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    stock_code: str = Field(serialization_alias="stockCode")
    period: CandlePeriod
    interval: str = "DAY"
    candles: list[CandleItem]


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


@router.get("/{stock_code}/candles", response_model=CandlesResponse)
async def get_candles(
    stock_code: Annotated[str, Path(pattern=r"^\d{6}$")],
    period: Annotated[CandlePeriod, Query()],
    _auth: InternalToken,
    db: DbSession,
) -> CandlesResponse:
    """KST 현재일을 기준으로 수정주가 일봉을 오래된 순서부터 돌려준다."""
    today = now_kst().date()
    rows = (
        await db.execute(
            select(
                PriceDaily.trade_date,
                PriceDaily.open,
                PriceDaily.high,
                PriceDaily.low,
                PriceDaily.close,
                PriceDaily.volume,
            )
            .where(
                PriceDaily.ticker == stock_code,
                PriceDaily.trade_date >= period.start_date(today),
                PriceDaily.trade_date <= today,
                PriceDaily.open.is_not(None),
                PriceDaily.high.is_not(None),
                PriceDaily.low.is_not(None),
                PriceDaily.volume.is_not(None),
            )
            .order_by(PriceDaily.trade_date)
        )
    ).all()
    return CandlesResponse(
        stock_code=stock_code,
        period=period,
        candles=[
            CandleItem(
                date=trade_date,
                open=open_price,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
            for trade_date, open_price, high, low, close, volume in rows
        ],
    )
