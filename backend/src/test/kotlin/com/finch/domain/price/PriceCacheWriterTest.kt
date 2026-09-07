package com.finch.domain.price

import com.finch.TestcontainersConfiguration
import com.finch.domain.price.service.PriceCacheWriter
import com.finch.domain.price.service.PriceCollectorLease
import com.finch.domain.price.service.PriceService
import com.finch.domain.price.service.PriceTick
import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate

@Import(TestcontainersConfiguration::class)
@SpringBootTest
internal class PriceCacheWriterTest @Autowired constructor(
	private val writer: PriceCacheWriter,
	private val reader: PriceService,
	private val redisTemplate: StringRedisTemplate,
) {

	@AfterEach
	fun cleanUp() {
		redisTemplate.delete(KEY)
		redisTemplate.delete(LEASE_KEY)
	}

	@Test
	@DisplayName("Redis에 쓴 틱을 기존 PriceService가 변경 없이 읽고 오래돼도 마지막 값을 유지한다")
	fun writesInExistingReaderFormat() {
		val oldTick = PriceTick(73_500, OffsetDateTime.now().minusMinutes(1))
		writer.write(STOCK_CODE, oldTick)

		val result = reader.getAll(listOf(STOCK_CODE), mapOf(STOCK_CODE to 74_400)).getValue(STOCK_CODE)

		assertThat(result.currentPrice).isEqualTo(73_500)
		assertThat(result.changeAmount).isEqualTo(-900)
		assertThat(result.stale).isTrue()
		assertThat(redisTemplate.getExpire(KEY)).isEqualTo(-1)
	}

	@Test
	@DisplayName("Redis 임대는 두 backend 복제본 중 한 수집자에게만 열린다")
	fun electsSingleCollector() {
		val first = PriceCollectorLease(redisTemplate)
		val second = PriceCollectorLease(redisTemplate)

		assertThat(first.acquireOrRenew()).isTrue()
		assertThat(second.acquireOrRenew()).isFalse()
		assertThat(first.acquireOrRenew()).isTrue()
	}

	companion object {
		private const val STOCK_CODE = "005930"
		private const val KEY = "price:$STOCK_CODE"
		private const val LEASE_KEY = "price:collector:lease"
	}
}
