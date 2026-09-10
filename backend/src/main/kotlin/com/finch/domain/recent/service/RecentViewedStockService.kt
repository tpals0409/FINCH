package com.finch.domain.recent.service

import com.finch.domain.recent.dto.response.RecentViewedRes
import com.finch.domain.recent.repository.RecentViewedStockRepository
import com.finch.domain.stock.service.StockService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 최근 본 종목의 자동 기록과 30건 FIFO 목록을 관리한다. */
@Service
class RecentViewedStockService(
	private val repository: RecentViewedStockRepository,
	private val stockService: StockService,
) {

	@Transactional
	fun record(userId: Long, stockCode: String) {
		repository.upsert(userId, stockCode)
		val overflow = repository.findByUserIdOrderByViewedAtDescIdDesc(userId).drop(MAX_COUNT)
		overflow.forEach { repository.deleteById(requireNotNull(it.id)) }
	}

	@Transactional(readOnly = true)
	fun list(userId: Long): RecentViewedRes {
		val entries = repository.findByUserIdOrderByViewedAtDescIdDesc(userId)
		val summaries = stockService.getSummaries(entries.map { it.stockCode })
		return RecentViewedRes(entries.mapNotNull { entry ->
			summaries[entry.stockCode]?.let { RecentViewedRes.item(it, entry.viewedAt) }
		})
	}

	@Transactional
	fun remove(userId: Long, stockCode: String) {
		repository.deleteByUserIdAndStockCode(userId, stockCode)
	}

	@Transactional
	fun removeAll(userId: Long) {
		repository.deleteByUserId(userId)
	}

	companion object {
		const val MAX_COUNT = 30
	}
}
