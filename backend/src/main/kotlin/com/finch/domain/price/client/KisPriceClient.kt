package com.finch.domain.price.client

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.finch.domain.price.service.PriceTick
import java.time.Clock
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import org.slf4j.LoggerFactory
import tools.jackson.databind.ObjectMapper

/** KIS OAuth 토큰과 국내주식 현재가 REST 호출을 한곳에서 관리한다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class KisPriceClient internal constructor(
	private val webClient: WebClient,
	private val objectMapper: ObjectMapper,
	private val appKey: String,
	private val appSecret: String,
	private val clock: Clock,
) {

	@Autowired
	constructor(
		objectMapper: ObjectMapper,
		@Value("\${KIS_BASE_URL}") baseUrl: String,
		@Value("\${KIS_APP_KEY}") appKey: String,
		@Value("\${KIS_APP_SECRET}") appSecret: String,
	) : this(WebClient.builder().baseUrl(baseUrl).build(), objectMapper, appKey, appSecret, Clock.systemUTC())

	@Volatile
	private var cachedToken: CachedToken? = null

	fun fetch(stockCode: String): PriceTick = fetch(stockCode, mayRefreshToken = true)

	private fun fetch(stockCode: String, mayRefreshToken: Boolean): PriceTick {
		val response = call(
			webClient.get()
				.uri { builder ->
					builder.path(PRICE_PATH)
						.queryParam("FID_COND_MRKT_DIV_CODE", "J")
						.queryParam("FID_INPUT_ISCD", stockCode)
						.build()
				}
				.header(HttpHeaders.AUTHORIZATION, "Bearer ${accessToken()}")
				.header("appkey", appKey)
				.header("appsecret", appSecret)
				.header("tr_id", PRICE_TR_ID),
		)

		if (response.status == 429) {
			val details = errorDetails(response.body)
			throw KisApiException(
				retryable = true,
				retryAfter = retryAfter(response.retryAfter),
				status = response.status,
				kisMsgCd = details.code,
				kisMsg = details.message,
			)
		}

		val body = parse(response.body, KisPriceResponse::class.java)
		if (mayRefreshToken && body?.messageCode == TOKEN_EXPIRED_CODE) {
			invalidateToken()
			return fetch(stockCode, mayRefreshToken = false)
		}
		if (response.status !in 200..299 || body?.resultCode != SUCCESS_CODE) {
			val details = errorDetails(response.body)
			throw KisApiException(
				retryable = response.status >= 500 || response.status == 408,
				status = response.status,
				code = body?.messageCode,
				kisMsgCd = details.code,
				kisMsg = details.message,
			)
		}

		val currentPrice = body.output?.currentPrice?.toLongOrNull()?.takeIf { it > 0 }
			?: throw KisApiException(
				retryable = false,
				status = response.status,
				code = "INVALID_PRICE",
			)
		return PriceTick(currentPrice, OffsetDateTime.ofInstant(clock.instant(), KST))
	}

	@Synchronized
	private fun accessToken(): String {
		val now = clock.instant()
		cachedToken?.takeIf { now.isBefore(it.refreshAt) }?.let { return it.value }

		val response = call(
			webClient.post()
				.uri(TOKEN_PATH)
				.contentType(MediaType.APPLICATION_JSON)
				.bodyValue(TokenRequest(appKey, appSecret)),
		)
		val body = parse(response.body, KisTokenResponse::class.java)
		val details = errorDetails(response.body)
		if (body?.errorCode == TOKEN_RATE_LIMIT_CODE) {
			throw KisApiException(
				retryable = true,
				retryAfter = TOKEN_RATE_LIMIT_DELAY,
				status = response.status,
				code = body.errorCode,
				kisMsgCd = details.code,
				kisMsg = details.message,
			)
		}
		if (response.status !in 200..299) {
			throw KisApiException(
				retryable = response.status >= 500 || response.status == 429,
				retryAfter = if (response.status == 429) retryAfter(response.retryAfter) else null,
				status = response.status,
				code = body?.errorCode,
				kisMsgCd = details.code,
				kisMsg = details.message,
			)
		}

		val token = body?.accessToken?.takeIf(String::isNotBlank)
		val expiresIn = body?.expiresIn?.takeIf { it > 0 }
		if (token == null || expiresIn == null) {
			throw KisApiException(
				retryable = false,
				status = response.status,
				code = "INVALID_TOKEN_RESPONSE",
			)
		}

		val expiresAt = now.plusSeconds(expiresIn)
		val refreshAt = expiresAt.minus(TOKEN_REFRESH_AHEAD).coerceAtLeast(now.plusSeconds(1))
		cachedToken = CachedToken(token, refreshAt)
		log.info(
			"KIS 토큰 발급 성공 expiresAt={} refreshAt={} refreshAhead={}",
			expiresAt,
			refreshAt,
			Duration.between(refreshAt, expiresAt),
		)
		return token
	}

	@Synchronized
	private fun invalidateToken() {
		cachedToken = null
	}

	private fun call(spec: WebClient.RequestHeadersSpec<*>): HttpResponse {
		try {
			return spec.exchangeToMono { response ->
				response.bodyToMono(String::class.java)
					.defaultIfEmpty("")
					.map { body ->
						HttpResponse(
							status = response.statusCode().value(),
							body = body,
							retryAfter = response.headers().asHttpHeaders().getFirst(HttpHeaders.RETRY_AFTER),
						)
					}
			}.block(CALL_TIMEOUT)
				?: throw KisApiException(retryable = true, code = "EMPTY_RESPONSE")
		} catch (e: KisApiException) {
			throw e
		} catch (e: RuntimeException) {
			throw KisApiException(retryable = true, code = "NETWORK_ERROR", cause = e)
		}
	}

	private fun <T> parse(raw: String, type: Class<T>): T? =
		runCatching { objectMapper.readValue(raw, type) }.getOrNull()

	private fun retryAfter(raw: String?): Duration? {
		if (raw == null) return null
		raw.toLongOrNull()?.takeIf { it >= 0 }?.let { return Duration.ofSeconds(it) }
		return runCatching {
			Duration.between(clock.instant(), ZonedDateTime.parse(raw, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant())
				.coerceAtLeast(Duration.ZERO)
		}.getOrNull()
	}

	private fun errorDetails(raw: String): ErrorDetails {
		val body = parse(raw, KisErrorResponse::class.java)
		return ErrorDetails(body?.messageCode ?: body?.errorCode, body?.message)
	}

	private data class CachedToken(
		val value: String,
		val refreshAt: java.time.Instant,
	)

	private data class HttpResponse(val status: Int, val body: String, val retryAfter: String?)

	private data class ErrorDetails(val code: String?, val message: String?)

	private data class TokenRequest(
		val appkey: String,
		val appsecret: String,
		@param:JsonProperty("grant_type") val grantType: String = "client_credentials",
	)

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KisTokenResponse(
		@param:JsonProperty("access_token") val accessToken: String?,
		@param:JsonProperty("expires_in") val expiresIn: Long?,
		@param:JsonProperty("error_code") val errorCode: String?,
	)

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KisErrorResponse(
		@param:JsonProperty("msg_cd") val messageCode: String?,
		@param:JsonProperty("msg1") val message: String?,
		@param:JsonProperty("error_code") val errorCode: String?,
	)

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KisPriceResponse(
		@param:JsonProperty("rt_cd") val resultCode: String?,
		@param:JsonProperty("msg_cd") val messageCode: String?,
		val output: KisPriceOutput?,
	)

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KisPriceOutput(
		@param:JsonProperty("stck_prpr") val currentPrice: String?,
	)

	companion object {
		private val log = LoggerFactory.getLogger(KisPriceClient::class.java)
		private const val TOKEN_PATH = "/oauth2/tokenP"
		private const val PRICE_PATH = "/uapi/domestic-stock/v1/quotations/inquire-price"
		private const val PRICE_TR_ID = "FHKST01010100"
		private const val SUCCESS_CODE = "0"
		private const val TOKEN_EXPIRED_CODE = "EGW00123"
		private const val TOKEN_RATE_LIMIT_CODE = "EGW00133"
		private val CALL_TIMEOUT = Duration.ofSeconds(5)
		private val TOKEN_REFRESH_AHEAD = Duration.ofMinutes(1)
		private val TOKEN_RATE_LIMIT_DELAY = Duration.ofMinutes(1)
		private val KST = ZoneId.of("Asia/Seoul")
	}
}
