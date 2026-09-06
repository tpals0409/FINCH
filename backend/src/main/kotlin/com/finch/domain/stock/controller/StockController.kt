package com.finch.domain.stock.controller

import com.finch.domain.stock.dto.response.CandlesRes
import com.finch.domain.stock.dto.response.StockDetailRes
import com.finch.domain.stock.dto.response.StockSearchRes
import com.finch.domain.stock.entity.CandlePeriod
import com.finch.domain.stock.service.StockService
import com.finch.domain.watchlist.service.WatchlistService
import com.finch.global.security.LoginUser
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 종목 API (apiSpec 5장).
 *
 * ⚠️ **상세 응답의 "최근 본 종목 자동 기록" 은 아직 없다** (apiSpec 5.2). `recent_viewed_stock`
 * 테이블은 있지만 엔티티가 없고, 읽는 쪽인 `GET /stocks/recent` 도 없다. 기록만 먼저 넣으면
 * 아무도 안 읽는 행이 쌓인다.
 *
 * `watched` 를 여기서 조립해 넘기는 이유는 `WatchlistService` 주석에 있다 — 도메인끼리 순환한다.
 */
@RestController
@RequestMapping("/api/v1/stocks")
class StockController(
	private val stockService: StockService,
	private val watchlistService: WatchlistService,
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
		@Min(1, message = "1 이상 100 이하여야 합니다")
		@Max(100, message = "1 이상 100 이하여야 합니다")
		size: Int,
	): StockSearchRes = stockService.search(keyword, size)

	@GetMapping("/{stockCode}")
	fun detail(@LoginUser userId: Long, @PathVariable stockCode: String): StockDetailRes =
		stockService.getDetail(stockCode, watchlistService.isWatched(userId, stockCode))

	@GetMapping("/{stockCode}/candles")
	fun candles(
		@PathVariable stockCode: String,
		@RequestParam(defaultValue = "1M") period: CandlePeriod,
	): CandlesRes = stockService.getCandles(stockCode, period)
}
