package com.finch.domain.price.client

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.util.concurrent.atomic.AtomicInteger
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.ClientResponse
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono
import tools.jackson.databind.ObjectMapper

internal class KisPriceClientTest {

	private val clock = Clock.fixed(Instant.parse("2026-09-07T06:30:00Z"), ZoneOffset.UTC)
	private val objectMapper = ObjectMapper()

	@Test
	@DisplayName("토큰을 한 번 발급해 재사용하고 현재가를 KST 수신 시각과 함께 읽는다")
	fun fetchesPriceAndReusesToken() {
		val requests = mutableListOf<ClientRequest>()
		val client = clientOf { request ->
			requests += request
			if (request.method().name() == "POST") json(HttpStatus.OK, fixture("token-success.json"))
			else json(HttpStatus.OK, fixture("inquire-price-success.json"))
		}

		val first = client.fetch("005930")
		val second = client.fetch("000660")

		assertThat(first.currentPrice).isEqualTo(73_500)
		assertThat(first.asOf.toString()).isEqualTo("2026-09-07T15:30+09:00")
		assertThat(second.currentPrice).isEqualTo(73_500)
		assertThat(requests.count { it.method().name() == "POST" }).isEqualTo(1)
		assertThat(requests.count { it.method().name() == "GET" }).isEqualTo(2)
		assertThat(requests.last().headers().getFirst("tr_id")).isEqualTo("FHKST01010100")
		assertThat(requests.last().url().query).contains("FID_INPUT_ISCD=000660")
	}

	@Test
	@DisplayName("KIS가 토큰 만료 코드를 주면 토큰을 갱신하고 현재가를 정확히 한 번 다시 요청한다")
	fun refreshesExpiredTokenOnce() {
		val sequence = AtomicInteger()
		val client = clientOf { request ->
			when (sequence.getAndIncrement()) {
				0 -> json(HttpStatus.OK, fixture("token-success.json").replace("<redacted>", "first-token"))
				1 -> json(HttpStatus.OK, """{"rt_cd":"1","msg_cd":"EGW00123","msg1":"기간이 만료된 token 입니다."}""")
				2 -> json(HttpStatus.OK, fixture("token-success.json").replace("<redacted>", "second-token"))
				else -> json(HttpStatus.OK, fixture("inquire-price-success.json"))
			}
		}

		assertThat(client.fetch("005930").currentPrice).isEqualTo(73_500)
		assertThat(sequence.get()).isEqualTo(4)
	}

	@Test
	@DisplayName("429 Retry-After 초를 호출자에게 전달한다")
	fun exposesRetryAfter() {
		val client = clientOf { request ->
			if (request.method().name() == "POST") json(HttpStatus.OK, fixture("token-success.json"))
			else json(HttpStatus.TOO_MANY_REQUESTS, "{}", "7")
		}

		assertThatThrownBy { client.fetch("005930") }
			.isInstanceOf(KisApiException::class.java)
			.extracting("retryAfter")
			.isEqualTo(Duration.ofSeconds(7))
	}

	@Test
	@DisplayName("토큰 발급 1분 제한 EGW00133은 60초 뒤 재시도할 오류로 분류한다")
	fun pausesAfterTokenRateLimit() {
		val client = clientOf {
			json(
				HttpStatus.FORBIDDEN,
				fixture("token-rate-limit.json"),
			)
		}

		assertThatThrownBy { client.fetch("005930") }
			.isInstanceOf(KisApiException::class.java)
			.extracting("retryable", "retryAfter")
			.containsExactly(true, Duration.ofMinutes(1))
	}

	@Test
	@DisplayName("현재가 0은 유효한 가격으로 캐시에 넘기지 않는다")
	fun rejectsZeroPrice() {
		val client = clientOf { request ->
			if (request.method().name() == "POST") json(HttpStatus.OK, fixture("token-success.json"))
			else json(HttpStatus.OK, fixture("inquire-price-success.json").replace("73500", "0"))
		}

		assertThatThrownBy { client.fetch("005930") }
			.isInstanceOf(KisApiException::class.java)
			.hasMessageContaining("INVALID_PRICE")
	}

	@Test
	@DisplayName("KIS 실패 본문을 보존하되 토큰 필드는 마스킹한다")
	fun keepsSanitizedFailureBody() {
		val client = clientOf { request ->
			if (request.method().name() == "POST") json(HttpStatus.OK, fixture("token-success.json"))
			else json(
				HttpStatus.BAD_REQUEST,
				"""{"rt_cd":"1","msg_cd":"E123","msg1":"종목코드 오류","access_token":"do-not-log"}""",
			)
		}

		assertThatThrownBy { client.fetch("005930") }
			.isInstanceOf(KisApiException::class.java)
			.extracting("responseBody")
			.isEqualTo("""{"rt_cd":"1","msg_cd":"E123","msg1":"종목코드 오류","access_token":"[REDACTED]"}""")
	}

	private fun clientOf(responder: (ClientRequest) -> ClientResponse): KisPriceClient {
		val webClient = WebClient.builder()
			.exchangeFunction { request -> Mono.just(responder(request)) }
			.build()
		return KisPriceClient(webClient, objectMapper, "app-key", "app-secret", clock)
	}

	private fun json(status: HttpStatus, body: String, retryAfter: String? = null): ClientResponse {
		val builder = ClientResponse.create(status)
			.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
			.body(body)
		retryAfter?.let { builder.header("Retry-After", it) }
		return builder.build()
	}

	private fun fixture(name: String): String =
		checkNotNull(javaClass.getResource("/fixtures/kis/$name")).readText()
}
