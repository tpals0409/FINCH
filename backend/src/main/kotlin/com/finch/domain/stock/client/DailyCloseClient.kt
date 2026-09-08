package com.finch.domain.stock.client

import java.time.Duration
import java.time.LocalDate
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

/** AI가 적재한 최근 거래일의 전 종목 종가를 읽는다. 원천 거래일 판정은 AI 한 곳이 맡는다. */
@Component
internal class DailyCloseClient internal constructor(
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

	fun fetchLatest(): DailyCloseBatch =
		client.get()
			.uri(INTERNAL_PATH)
			.header(INTERNAL_TOKEN_HEADER, internalToken)
			.accept(MediaType.APPLICATION_JSON)
			.retrieve()
			.body(DailyCloseBatch::class.java)
			?: throw IllegalStateException("AI 일별 종가 응답 본문이 비어 있습니다")

	companion object {
		private const val INTERNAL_PATH = "/internal/prices/daily-close"
		private const val INTERNAL_TOKEN_HEADER = "X-Internal-Token"
		private val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(3)
	}
}

internal data class DailyCloseBatch(
	val tradeDate: LocalDate?,
	val items: List<DailyCloseItem>,
)

internal data class DailyCloseItem(
	val stockCode: String,
	val close: Long,
) {
	init {
		require(STOCK_CODE.matches(stockCode)) { "AI 일별 종가의 종목코드는 숫자 6자리여야 합니다" }
		require(close > 0) { "AI 일별 종가는 0보다 커야 합니다" }
	}

	companion object {
		private val STOCK_CODE = Regex("\\d{6}")
	}
}
