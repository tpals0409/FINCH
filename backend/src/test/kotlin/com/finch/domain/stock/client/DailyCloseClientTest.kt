package com.finch.domain.stock.client

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient

/** 실제 HTTP 요청으로 내부 경로·인증 헤더·응답 계약을 고정한다. */
class DailyCloseClientTest {

	private lateinit var server: HttpServer
	private var receivedTarget: String? = null
	private var receivedToken: String? = null
	private var receivedUserId: String? = null
	private var responseBody = """
		{
		  "tradeDate": "2026-09-07",
		  "items": [
		    { "stockCode": "005930", "close": 73500 },
		    { "stockCode": "000660", "close": 270000 }
		  ]
		}
	""".trimIndent()

	@BeforeEach
	fun startServer() {
		server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
		server.createContext("/") { exchange -> respond(exchange) }
		server.start()
	}

	@AfterEach
	fun stopServer() {
		server.stop(0)
	}

	@Test
	@DisplayName("최근 거래일 종가는 사용자 헤더 없이 내부 토큰으로 전 종목을 읽는다")
	fun fetchesLatestDailyClose() {
		val client = DailyCloseClient(
			RestClient.builder().baseUrl("http://127.0.0.1:${server.address.port}").build(),
			"shared-token",
		)

		val batch = client.fetchLatest()

		assertThat(receivedTarget).isEqualTo("/internal/prices/daily-close")
		assertThat(receivedToken).isEqualTo("shared-token")
		assertThat(receivedUserId).isNull()
		assertThat(batch.tradeDate.toString()).isEqualTo("2026-09-07")
		assertThat(batch.items).containsExactly(
			DailyCloseItem("005930", 73_500),
			DailyCloseItem("000660", 270_000),
		)
	}

	@Test
	@DisplayName("원천 테이블이 비면 null tradeDate와 빈 items를 성공 응답으로 읽는다")
	fun acceptsEmptySource() {
		responseBody = """{ "tradeDate": null, "items": [] }"""
		val client = DailyCloseClient(
			RestClient.builder().baseUrl("http://127.0.0.1:${server.address.port}").build(),
			"shared-token",
		)

		val batch = client.fetchLatest()

		assertThat(batch.tradeDate).isNull()
		assertThat(batch.items).isEmpty()
	}

	private fun respond(exchange: HttpExchange) {
		exchange.use {
			receivedTarget = exchange.requestURI.toString()
			receivedToken = exchange.requestHeaders.getFirst("X-Internal-Token")
			receivedUserId = exchange.requestHeaders.getFirst("X-User-Id")
			val body = responseBody.toByteArray()
			exchange.responseHeaders.add("Content-Type", "application/json")
			exchange.sendResponseHeaders(200, body.size.toLong())
			exchange.responseBody.write(body)
		}
	}
}
