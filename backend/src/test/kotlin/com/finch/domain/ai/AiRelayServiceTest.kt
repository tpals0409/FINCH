package com.finch.domain.ai

import com.finch.domain.ai.exception.AiErrorCode
import com.finch.domain.ai.service.AiRelayService
import com.finch.global.exception.AiRelayException
import com.finch.global.exception.CustomException
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import tools.jackson.databind.ObjectMapper

/**
 * 중계의 계약을 고정한다 — 표기 변환·봉투 벗기기·에러 통과.
 *
 * AI 서버 대신 JDK 내장 HTTP 서버를 세운다. 목 프레임워크를 쓰면 RestClient 가 실제로 무엇을
 * 보내는지(헤더·본문 표기)를 못 본다. 여기서 검증하려는 것이 정확히 그것이다.
 */
class AiRelayServiceTest {

	private val mapper = ObjectMapper()

	private lateinit var server: HttpServer

	/** 다음 요청에 돌려줄 응답. 테스트마다 갈아 끼운다. */
	private var response: Pair<Int, String> = 200 to "{}"

	private var delay: Duration = Duration.ZERO

	private var receivedBody: String? = null

	private var receivedHeaders: Map<String, String> = emptyMap()

	private var receivedTarget: String? = null

	@BeforeEach
	fun startStub() {
		server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
		server.createContext("/") { exchange -> respond(exchange) }
		server.start()
	}

	@AfterEach
	fun stopStub() {
		server.stop(0)
	}

	private fun respond(exchange: HttpExchange) {
		exchange.use {
			receivedTarget = exchange.requestURI.toString()
			receivedBody = exchange.requestBody.readBytes().decodeToString().takeIf { it.isNotEmpty() }
			// HttpServer 가 헤더 이름을 자기 표기로 정규화한다. 비교는 소문자로 맞춘다.
			receivedHeaders = exchange.requestHeaders.entries.associate { (k, v) -> k.lowercase() to v.first() }
			if (!delay.isZero) Thread.sleep(delay.toMillis())

			val (status, body) = response
			val bytes = body.toByteArray()
			exchange.responseHeaders.add("Content-Type", "application/json")
			exchange.sendResponseHeaders(status, bytes.size.toLong())
			exchange.responseBody.write(bytes)
		}
	}

	private fun service(
		baseUrl: String = "http://127.0.0.1:${server.address.port}",
		timeout: Duration = Duration.ofSeconds(5),
	) = AiRelayService(baseUrl, "shared-token", timeout, mapper)

	@Test
	@DisplayName("성공 응답은 봉투를 벗고 보존 4종만 content 옆에 남는다")
	fun repacksEnvelope() {
		response = 200 to """
			{
			  "request_id": "req_0001",
			  "generated_at": "2026-09-07T10:00:00+09:00",
			  "data_as_of": { "price": "2026-09-07T09:00:00+09:00" },
			  "model": "gpt-5.4-mini",
			  "cached": false,
			  "content": { "risk_level": "high", "risk_score": 72, "related_tickers": ["005930"] },
			  "citations": [],
			  "disclaimer": "본 서비스는 모의투자입니다"
			}
		""".trimIndent()

		val result = service().relay(HttpMethod.GET, "/briefing", userId = 7)

		assertThat(result.propertyNames())
			.containsExactly("content", "requestId", "dataAsOf", "citations", "disclaimer")
		assertThat(result["requestId"].stringValue()).isEqualTo("req_0001")
		assertThat(result["dataAsOf"]["price"].stringValue()).isEqualTo("2026-09-07T09:00:00+09:00")
	}

	@Test
	@DisplayName("content 안쪽 키는 camelCase 가 되고 값은 그대로다")
	fun convertsKeysNotValues() {
		response = 200 to """
			{ "content": { "risk_level": "MARKET_CLOSED", "related_tickers": ["005930"] } }
		""".trimIndent()

		val content = service().relay(HttpMethod.GET, "/briefing", userId = 7)["content"]

		assertThat(content.propertyNames()).containsExactly("riskLevel", "relatedTickers")
		// 값에 손대면 종목코드의 앞 0 이나 enum 문자열이 조용히 바뀐다.
		assertThat(content["riskLevel"].stringValue()).isEqualTo("MARKET_CLOSED")
		assertThat(content["relatedTickers"][0].stringValue()).isEqualTo("005930")
	}

	@Test
	@DisplayName("요청 본문은 snake_case 로 바뀌고 신뢰 헤더 둘이 실린다")
	fun sendsSnakeCaseWithTrustedHeaders() {
		response = 200 to """{ "content": {} }"""
		val body = mapper.readTree("""{ "requestId": "req_1", "context": { "linkedTradeId": 12 } }""")

		service().relay(HttpMethod.POST, "/feedback", userId = 7, body = body)

		val sent = mapper.readTree(receivedBody!!)
		assertThat(sent.propertyNames()).containsExactly("request_id", "context")
		assertThat(sent["context"].propertyNames()).containsExactly("linked_trade_id")
		assertThat(receivedHeaders["x-internal-token"]).isEqualTo("shared-token")
		// 사용자 식별자는 토큰에서 나온 값이다 (aiApiSpec 4장).
		assertThat(receivedHeaders["x-user-id"]).isEqualTo("7")
	}

	@Test
	@DisplayName("경로 변수와 쿼리는 인코딩되어 AI 접두사 아래로 붙는다")
	fun buildsPrefixedUri() {
		response = 200 to """{ "content": {} }"""

		service().relay(
			HttpMethod.GET,
			"/wiki/facts/{factId}",
			userId = 7,
			query = mapOf("date" to "2026-09-07", "skip" to null),
			pathVariables = listOf("a b"),
		)

		assertThat(receivedTarget).isEqualTo("/api/ai/v1/wiki/facts/a%20b?date=2026-09-07")
	}

	@Test
	@DisplayName("AI 가 낸 에러는 상태·코드·requestId 를 그대로 통과시킨다")
	fun passesThroughAiError() {
		response = 409 to """
			{
			  "code": "INSUFFICIENT_DATA",
			  "message": "분석에 필요한 데이터가 부족합니다",
			  "detail": { "reason": "ledger_unavailable" },
			  "request_id": "req_0009"
			}
		""".trimIndent()

		assertThatThrownBy { service().relay(HttpMethod.GET, "/briefing", userId = 7) }
			.isInstanceOfSatisfying(AiRelayException::class.java) { e ->
				assertThat(e.status).isEqualTo(HttpStatus.CONFLICT)
				assertThat(e.code).isEqualTo("INSUFFICIENT_DATA")
				// 피드백이 원본 응답을 찾는 열쇠다 (apiSpec 10.3).
				assertThat(e.requestId).isEqualTo("req_0009")
			}
	}

	@Test
	@DisplayName("명세 모양이 아닌 에러 본문은 우리 502 로 바꾼다")
	fun unknownErrorShapeBecomesUpstreamUnavailable() {
		response = 422 to """{ "detail": [{ "loc": ["body"], "msg": "field required" }] }"""

		assertThatThrownBy { service().relay(HttpMethod.GET, "/briefing", userId = 7) }
			.isInstanceOfSatisfying(CustomException::class.java) { e ->
				assertThat(e.errorCode).isEqualTo(AiErrorCode.AI_UPSTREAM_UNAVAILABLE)
			}
	}

	@Test
	@DisplayName("연결 실패는 502, 읽기 시간 초과는 504 로 갈린다")
	fun separatesTimeoutFromConnectionFailure() {
		// 아무도 듣지 않는 포트. 프론트가 "다시 시도" 를 띄울지가 이 구분에 달려 있다.
		assertThatThrownBy {
			service(baseUrl = "http://127.0.0.1:1").relay(HttpMethod.GET, "/briefing", userId = 7)
		}.isInstanceOfSatisfying(CustomException::class.java) { e ->
			assertThat(e.errorCode).isEqualTo(AiErrorCode.AI_UPSTREAM_UNAVAILABLE)
		}

		response = 200 to """{ "content": {} }"""
		delay = Duration.ofSeconds(2)

		assertThatThrownBy {
			service(timeout = Duration.ofMillis(200)).relay(HttpMethod.GET, "/briefing", userId = 7)
		}.isInstanceOfSatisfying(CustomException::class.java) { e ->
			assertThat(e.errorCode).isEqualTo(AiErrorCode.AI_UPSTREAM_TIMEOUT)
		}
	}
}
