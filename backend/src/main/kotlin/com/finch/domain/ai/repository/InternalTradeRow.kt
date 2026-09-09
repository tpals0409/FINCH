package com.finch.domain.ai.repository

import java.time.Instant

interface InternalTradeRow {
	val tradeId: Long
	val stockCode: String
	val side: String
	val price: Long
	val quantity: Long
	val executedAt: Instant
}
