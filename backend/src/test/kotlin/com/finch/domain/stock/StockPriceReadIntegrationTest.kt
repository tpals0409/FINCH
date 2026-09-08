package com.finch.domain.stock

import com.finch.TestcontainersConfiguration
import com.finch.domain.price.service.PriceCacheWriter
import com.finch.domain.price.service.PriceTick
import com.finch.domain.stock.exception.StockErrorCode
import com.finch.domain.stock.service.StockService
import com.finch.global.exception.CustomException
import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate

/** 실제 종목 마스터와 Redis 시세를 연결해 apiSpec 5.4·5.5의 서비스 계약을 검증한다. */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
internal class StockPriceReadIntegrationTest @Autowired constructor(
	private val stockService: StockService,
	private val priceWriter: PriceCacheWriter,
	private val redisTemplate: StringRedisTemplate,
) {

	@AfterEach
	fun cleanRedis() {
		redisTemplate.delete(listOf("price:005930", "price:000660"))
	}

	@Test
	@DisplayName("다건 현재가는 요청 순서를 보존하고 중복·없는 종목은 제외한다")
	fun returnsKnownStocksInRequestOrder() {
		priceWriter.write("005930", PriceTick(73_500, OffsetDateTime.now()))

		val response = stockService.getPrices(listOf("000660", "999999", "005930", "000660"))

		assertThat(response.items.map { it.stockCode }).containsExactly("000660", "005930")
		assertThat(response.items[0].currentPrice).isNull()
		assertThat(response.items[0].stale).isTrue()
		assertThat(response.items[1].currentPrice).isEqualTo(73_500)
	}

	@Test
	@DisplayName("단건 현재가는 없는 종목만 STOCK_NOT_FOUND 이고 시세가 없는 종목은 빈 성공 응답이다")
	fun distinguishesMissingStockFromMissingPrice() {
		val emptyPrice = stockService.getPrice("000660")
		assertThat(emptyPrice.currentPrice).isNull()
		assertThat(emptyPrice.stale).isTrue()

		assertThatThrownBy { stockService.getPrice("999999") }
			.isInstanceOfSatisfying(CustomException::class.java) {
				assertThat(it.errorCode).isEqualTo(StockErrorCode.STOCK_NOT_FOUND)
			}
	}
}
