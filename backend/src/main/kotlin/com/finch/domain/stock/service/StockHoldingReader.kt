package com.finch.domain.stock.service

import com.finch.domain.stock.dto.response.StockDetailRes

/** stock 상세에 붙는 보유 조회 포트. 구현은 holding을 소유한 portfolio가 제공한다. */
interface StockHoldingReader {
	fun getHolding(userId: Long, stockCode: String, currentPrice: Long?): StockDetailRes.Holding?
}
