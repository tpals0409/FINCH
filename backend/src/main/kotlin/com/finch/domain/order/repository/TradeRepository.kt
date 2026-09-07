package com.finch.domain.order.repository

import com.finch.domain.order.entity.Trade
import org.springframework.data.repository.Repository

interface TradeRepository : Repository<Trade, Long> {
	fun save(trade: Trade): Trade
}
