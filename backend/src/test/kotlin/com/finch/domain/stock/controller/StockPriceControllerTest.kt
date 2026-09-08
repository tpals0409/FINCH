package com.finch.domain.stock.controller

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.price.dto.response.PricesRes
import com.finch.domain.stock.service.StockService
import com.finch.domain.watchlist.service.WatchlistService
import java.math.BigDecimal
import java.time.OffsetDateTime
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/** apiSpec 5.4·5.5의 HTTP 계약과 `/prices` 고정 경로의 우선순위를 검증한다. */
@WebMvcTest(StockController::class)
@AutoConfigureMockMvc(addFilters = false)
class StockPriceControllerTest {

	@Autowired
	private lateinit var mockMvc: MockMvc

	@MockitoBean
	private lateinit var stockService: StockService

	@MockitoBean
	private lateinit var watchlistService: WatchlistService

	@Test
	@DisplayName("/stocks/prices 는 stockCode=prices 상세가 아니라 다건 현재가 핸들러로 간다")
	fun routesLiteralPricesPath() {
		given(stockService.getPrices(listOf("005930", "000660")))
			.willReturn(PricesRes(listOf(price("005930"), PriceRes.empty("000660"))))

		mockMvc.perform(get("/api/v1/stocks/prices").param("stockCodes", "005930,000660"))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].stockCode").value("005930"))
			.andExpect(jsonPath("$.items[0].currentPrice").value(73500))
			.andExpect(jsonPath("$.items[1].stockCode").value("000660"))
			.andExpect(jsonPath("$.items[1].currentPrice").isEmpty)
			.andExpect(jsonPath("$.items[1].stale").value(true))

		verify(stockService).getPrices(listOf("005930", "000660"))
	}

	@Test
	@DisplayName("단건 현재가는 PriceRes를 봉투 없이 그대로 내려준다")
	fun returnsSinglePrice() {
		given(stockService.getPrice("005930")).willReturn(price("005930"))

		mockMvc.perform(get("/api/v1/stocks/005930/price"))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.stockCode").value("005930"))
			.andExpect(jsonPath("$.currentPrice").value(73500))
			.andExpect(jsonPath("$.items").doesNotExist())
	}

	@Test
	@DisplayName("다건 현재가 파라미터가 없거나 비었거나 50건을 넘으면 INVALID_REQUEST 다")
	fun validatesStockCodes() {
		mockMvc.perform(get("/api/v1/stocks/prices"))
			.andExpect(status().isBadRequest)
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

		mockMvc.perform(get("/api/v1/stocks/prices").param("stockCodes", ""))
			.andExpect(status().isBadRequest)
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

		mockMvc.perform(
			get("/api/v1/stocks/prices")
				.param("stockCodes", (1..51).joinToString(",") { it.toString().padStart(6, '0') }),
		)
			.andExpect(status().isBadRequest)
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
	}

	@Test
	@DisplayName("다건 현재가의 각 종목코드는 숫자 6자리여야 한다")
	fun validatesEachStockCode() {
		mockMvc.perform(get("/api/v1/stocks/prices").param("stockCodes", "005930,00593A"))
			.andExpect(status().isBadRequest)
			.andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

		verifyNoInteractions(stockService)
	}

	private fun price(stockCode: String): PriceRes = PriceRes(
		stockCode = stockCode,
		currentPrice = 73500,
		changeAmount = -900,
		changeRate = BigDecimal("-1.21"),
		asOf = OffsetDateTime.parse("2026-08-20T14:30:00+09:00"),
		stale = false,
	)
}
