package com.finch.domain.stock.controller

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.price.dto.response.PricesRes
import com.finch.domain.recent.service.RecentViewedStockService
import com.finch.domain.stock.dto.response.CandlesRes
import com.finch.domain.stock.dto.response.StockDetailRes
import com.finch.domain.stock.dto.response.StockSearchRes
import com.finch.domain.stock.entity.CandlePeriod
import com.finch.domain.stock.service.StockService
import com.finch.domain.watchlist.service.WatchlistService
import com.finch.global.security.LoginUser
import com.finch.global.apiPayload.CursorPage
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.slf4j.LoggerFactory
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 종목 API (apiSpec 5장).
 *
 * `watched` 를 여기서 조립해 넘기는 이유는 `WatchlistService` 주석에 있다 — 도메인끼리 순환한다.
 */
@RestController
@RequestMapping("/api/v1/stocks")
class StockController(
	private val stockService: StockService,
	private val watchlistService: WatchlistService,
	private val recentViewedStockService: RecentViewedStockService,
) {

	/**
	 * 두 글자 미만과 범위 밖 `size` 는 `400 INVALID_REQUEST` 다.
	 *
	 * 빈 목록으로 넘기지 않는 이유는 프론트 MSW 목이 이미 400 으로 짜여 있어서다. 서버만 조용히
	 * 다르게 굴면 목으로 개발할 땐 에러 화면이 뜨고 운영에선 빈 목록이 떠, 그 차이가 배포 뒤에야 드러난다.
	 * 메시지 문구도 목과 같은 것을 쓴다.
	 */
	@GetMapping("/search")
	fun search(
		@RequestParam @Size(min = 2, message = "2글자 이상이어야 합니다") keyword: String,
		@RequestParam(defaultValue = "10")
		size: Int,
		@RequestParam(required = false) cursor: String?,
	): CursorPage<StockSearchRes.Item> = stockService.search(keyword, size, cursor)

	/** 벌크 경로는 종목코드 변수 경로와 별개다. 최대 50건 제한은 관심 종목 한도와 같다. */
	@GetMapping("/prices")
	fun prices(
		@RequestParam
		@Pattern(
			regexp = "\\d{6}(,\\d{6}){0,49}",
			message = "쉼표로 구분한 6자리 종목코드 1개 이상 50개 이하여야 합니다",
		)
		stockCodes: String,
	): PricesRes = stockService.getPrices(stockCodes.split(','))

	@GetMapping("/{stockCode}/price")
	fun price(@PathVariable stockCode: String): PriceRes = stockService.getPrice(stockCode)

	@GetMapping("/{stockCode}")
	fun detail(@LoginUser userId: Long, @PathVariable stockCode: String): StockDetailRes {
		val detail = stockService.getDetail(userId, stockCode, watchlistService.isWatched(userId, stockCode))
		try {
			recentViewedStockService.record(userId, stockCode)
		} catch (e: RuntimeException) {
			log.warn(
				"최근 본 종목 기록 실패 stockCode={} cause={}",
				stockCode,
				e::class.simpleName,
			)
		}
		return detail
	}

	@GetMapping("/{stockCode}/candles")
	fun candles(
		@PathVariable stockCode: String,
		@RequestParam(defaultValue = "1M") period: CandlePeriod,
	): CandlesRes = stockService.getCandles(stockCode, period)

	companion object {
		private val log = LoggerFactory.getLogger(StockController::class.java)
	}
}
