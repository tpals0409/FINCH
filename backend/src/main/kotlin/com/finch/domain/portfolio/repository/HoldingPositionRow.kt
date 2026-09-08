package com.finch.domain.portfolio.repository

/** holding과 stock의 읽기 전용 DTO 프로젝션. 다른 도메인의 Entity를 import하지 않는다. */
interface HoldingPositionRow {
	val stockCode: String
	val stockName: String
	val quantity: Long
	val avgBuyPrice: Long
	val previousClose: Long?
}
