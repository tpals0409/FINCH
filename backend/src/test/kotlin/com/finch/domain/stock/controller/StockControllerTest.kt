package com.finch.domain.stock.controller

import com.finch.domain.recent.service.RecentViewedStockService
import com.finch.domain.stock.dto.response.StockDetailRes
import com.finch.domain.stock.entity.Market
import com.finch.domain.stock.service.StockService
import com.finch.domain.watchlist.service.WatchlistService
import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mockito.mock
import org.mockito.Mockito.doThrow
import org.mockito.junit.jupiter.MockitoExtension

@ExtendWith(MockitoExtension::class)
class StockControllerTest {

	private val stockService = mock(StockService::class.java)
	private val watchlistService = mock(WatchlistService::class.java)
	private val recentViewedStockService = mock(RecentViewedStockService::class.java)
	private val controller = StockController(stockService, watchlistService, recentViewedStockService)

	@Test
	fun detailRemainsAvailableWhenRecentViewRecordingFails() {
		val detail = StockDetailRes(
			stockCode = "005930",
			stockName = "삼성전자",
			market = Market.KOSPI,
			currentPrice = null,
			previousClose = null,
			changeAmount = null,
			changeRate = null,
			suspended = false,
			suspendedReason = null,
			watched = false,
			asOf = OffsetDateTime.parse("2026-09-10T09:00:00+09:00"),
			holding = null,
		)
		given(watchlistService.isWatched(1L, "005930")).willReturn(false)
		given(stockService.getDetail(1L, "005930", false)).willReturn(detail)
		doThrow(RuntimeException("db unavailable")).`when`(recentViewedStockService).record(1L, "005930")

		assertThat(controller.detail(1L, "005930")).isSameAs(detail)
	}
}
