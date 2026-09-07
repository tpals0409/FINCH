package com.finch.domain.price.service

import com.finch.domain.price.client.KisApiException
import com.finch.domain.price.client.KisPriceClient
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.junit.jupiter.MockitoExtension

@ExtendWith(MockitoExtension::class)
internal class KisPriceCollectorTest {

	@Mock
	private lateinit var client: KisPriceClient

	@Mock
	private lateinit var targetRepository: PriceCollectionTargetRepository

	@Mock
	private lateinit var cacheWriter: PriceCacheWriter

	@Mock
	private lateinit var lease: PriceCollectorLease

	private val clock = Clock.fixed(Instant.parse("2026-09-07T06:30:00Z"), ZoneOffset.UTC)
	private val tick = PriceTick(73_500, OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC))

	@Test
	fun `한 배치의 활성 종목을 순서대로 수집해 캐시에 쓴다`() {
		given(lease.acquireOrRenew()).willReturn(true)
		given(targetRepository.findAfter("", 2)).willReturn(listOf("005930", "000660"))
		given(client.fetch("005930")).willReturn(tick)
		given(client.fetch("000660")).willReturn(tick)
		val collector = collector()

		collector.collect()

		verify(cacheWriter).write("005930", tick)
		verify(cacheWriter).write("000660", tick)
	}

	@Test
	fun `Retry-After 동안 다음 스케줄에서도 KIS를 다시 부르지 않는다`() {
		given(lease.acquireOrRenew()).willReturn(true)
		given(targetRepository.findAfter("", 2)).willReturn(listOf("005930"))
		given(client.fetch("005930")).willThrow(
			KisApiException(retryable = true, retryAfter = Duration.ofMinutes(1), status = 429),
		)
		val collector = collector()

		collector.collect()
		collector.collect()

		verify(client, times(1)).fetch("005930")
	}

	@Test
	fun `KST 장 운영시간이 지나면 임대와 KIS를 호출하지 않는다`() {
		val afterClose = Clock.fixed(Instant.parse("2026-09-07T06:30:01Z"), ZoneOffset.UTC)
		val collector = KisPriceCollector(
			client,
			targetRepository,
			cacheWriter,
			lease,
			batchSize = 2,
			clock = afterClose,
		)

		collector.collect()

		verifyNoInteractions(lease, targetRepository, client, cacheWriter)
	}

	@Test
	fun `KST 토요일 장 운영시간에도 임대와 KIS를 호출하지 않는다`() {
		val saturdayNoon = Clock.fixed(Instant.parse("2026-09-05T03:00:00Z"), ZoneOffset.UTC)
		val collector = KisPriceCollector(
			client,
			targetRepository,
			cacheWriter,
			lease,
			batchSize = 2,
			clock = saturdayNoon,
		)

		collector.collect()

		verifyNoInteractions(lease, targetRepository, client, cacheWriter)
	}

	private fun collector() =
		KisPriceCollector(client, targetRepository, cacheWriter, lease, batchSize = 2, clock = clock)
}
