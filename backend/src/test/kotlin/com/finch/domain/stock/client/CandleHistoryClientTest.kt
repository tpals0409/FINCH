package com.finch.domain.stock.client

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient

internal class CandleHistoryClientTest {
	private lateinit var server: HttpServer
	private var response = "{}"
	private var target: String? = null
	private var token: String? = null

	@BeforeEach
	fun startServer() {
		server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
		server.createContext("/") { exchange -> respond(exchange) }
		server.start()
	}

	@AfterEach
	fun stopServer() = server.stop(0)

	private fun respond(exchange: HttpExchange) {
		exchange.use {
			target = exchange.requestURI.toString()
			token = exchange.requestHeaders.getFirst("X-Internal-Token")
			val bytes = response.toByteArray()
			exchange.responseHeaders.add("Content-Type", "application/json")
			exchange.sendResponseHeaders(200, bytes.size.toLong())
			exchange.responseBody.write(bytes)
		}
	}

	private fun client() = CandleHistoryClient(
		RestClient.builder().baseUrl("http://127.0.0.1:${server.address.port}").build(),
		"service-token",
	)

	@Test
	fun `1년 요청 계약과 오름차순 OHLCV 응답을 보존한다`() {
		response = """
			{
			  "stockCode":"005930", "period":"1Y", "interval":"DAY",
			  "candles":[
			    {"date":"2026-09-04","open":70000,"high":72000,"low":69000,"close":71000,"volume":10},
			    {"date":"2026-09-07","open":71000,"high":73000,"low":70000,"close":72000,"volume":20}
			  ]
			}
		""".trimIndent()

		val result = client().fetch("005930")

		assertThat(target).isEqualTo("/internal/prices/005930/candles?period=1Y")
		assertThat(token).isEqualTo("service-token")
		assertThat(result.candles.map { it.date.toString() }).containsExactly("2026-09-04", "2026-09-07")
	}

	@Test
	fun `빈 캔들 응답은 성공으로 보존한다`() {
		response = """{"stockCode":"005930","period":"1Y","interval":"DAY","candles":[]}"""

		assertThat(client().fetch("005930").candles).isEmpty()
	}

	@Test
	fun `계약과 달리 정렬되지 않은 응답은 거부한다`() {
		response = """
			{
			  "stockCode":"005930", "period":"1Y", "interval":"DAY",
			  "candles":[
			    {"date":"2026-09-07","open":71000,"high":73000,"low":70000,"close":72000,"volume":20},
			    {"date":"2026-09-04","open":70000,"high":72000,"low":69000,"close":71000,"volume":10}
			  ]
			}
		""".trimIndent()

		assertThatThrownBy { client().fetch("005930") }
			.isInstanceOf(IllegalArgumentException::class.java)
			.hasMessageContaining("날짜 오름차순")
	}
}
