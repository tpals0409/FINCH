package com.finch.domain.stock.client

import java.time.Duration
import java.time.LocalDate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/** AI가 보관한 수정주가 일봉을 서비스 간 계약으로 읽는다. */
@Component
internal class CandleHistoryClient internal constructor(
	private val client: RestClient,
	private val internalToken: String,
) {
	@Autowired
	constructor(
		@Value("\${finch.ai.base-url}") baseUrl: String,
		@Value("\${finch.ai.internal-token}") internalToken: String,
		@Value("\${finch.ai.timeout}") timeout: Duration,
	) : this(
		RestClient.builder()
			.baseUrl(baseUrl.trimEnd('/'))
			.requestFactory(
				SimpleClientHttpRequestFactory().apply {
					setConnectTimeout(CONNECT_TIMEOUT)
					setReadTimeout(timeout)
				},
			)
			.build(),
		internalToken,
	)

	fun fetch(stockCode: String, period: String = PERIOD): CandleHistoryBatch {
		val body = client.get()
			.uri(INTERNAL_PATH, stockCode, period)
			.header(INTERNAL_TOKEN_HEADER, internalToken)
			.accept(MediaType.APPLICATION_JSON)
			.retrieve()
			.body(CandleHistoryBatch::class.java)
			?: throw IllegalStateException("AI 캔들 응답 본문이 비어 있습니다")

		require(body.stockCode == stockCode) { "AI 캔들 응답의 종목코드가 요청과 다릅니다" }
		require(body.period == period) { "AI 캔들 응답의 기간이 요청과 다릅니다" }
		require(body.interval == INTERVAL) { "AI 캔들 응답의 interval은 DAY여야 합니다" }
		require(body.candles.zipWithNext().all { (left, right) -> left.date < right.date }) {
			"AI 캔들 응답은 중복 없이 날짜 오름차순이어야 합니다"
		}
		return body
	}

	companion object {
		const val PERIOD = "1Y"
		private const val INTERVAL = "DAY"
		private const val INTERNAL_PATH = "/internal/prices/{stockCode}/candles?period={period}"
		private const val INTERNAL_TOKEN_HEADER = "X-Internal-Token"
		private val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(3)
	}
}

internal data class CandleHistoryBatch(
	val stockCode: String,
	val period: String,
	val interval: String,
	val candles: List<CandleHistoryItem>,
)

internal data class CandleHistoryItem(
	val date: LocalDate,
	val open: Long,
	val high: Long,
	val low: Long,
	val close: Long,
	val volume: Long,
) {
	init {
		require(open > 0 && high > 0 && low > 0 && close > 0) { "AI 캔들 가격은 0보다 커야 합니다" }
		require(volume >= 0) { "AI 캔들 거래량은 0 이상이어야 합니다" }
		require(high >= maxOf(open, close, low)) { "AI 캔들 고가는 시가·저가·종가 이상이어야 합니다" }
		require(low <= minOf(open, close, high)) { "AI 캔들 저가는 시가·고가·종가 이하여야 합니다" }
	}
}
