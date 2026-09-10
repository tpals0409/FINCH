package com.finch.domain.price.service

import com.finch.domain.price.client.KisApiException
import com.finch.domain.price.client.KisPriceClient
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension

@ExtendWith(MockitoExtension::class, OutputCaptureExtension::class)
internal class KisPriceCollectorTest {

	@Mock
	private lateinit var client: KisPriceClient

	@Mock
	private lateinit var targetRepository: PriceCollectionTargetRepository

	@Mock
	private lateinit var cacheWriter: PriceCacheWriter

	@Mock
	private lateinit var lease: PriceCollectorLease

	@Mock
	private lateinit var pacer: KisRequestPacer

	private val clock = Clock.fixed(Instant.parse("2026-09-07T06:30:00Z"), ZoneOffset.UTC)
	private val tick = PriceTick(73_500, OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC))

	@Test
	fun `한 배치의 활성 종목을 순서대로 수집해 캐시에 쓴다`() {
		given(lease.acquireOrRenew()).willReturn(true)
		given(pacer.awaitPermit()).willReturn(true)
		given(targetRepository.findAfter("", 2)).willReturn(listOf("005930", "000660"))
		given(client.fetch("005930")).willReturn(tick)
		given(client.fetch("000660")).willReturn(tick)
		val collector = collector()

		collector.collect()

		verify(cacheWriter).write("005930", tick)
		verify(cacheWriter).write("000660", tick)
		verify(pacer, times(2)).awaitPermit()
	}

	@Test
	fun `Retry-After 동안 다음 스케줄에서도 KIS를 다시 부르지 않는다`() {
		given(lease.acquireOrRenew()).willReturn(true)
		given(pacer.awaitPermit()).willReturn(true)
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
	fun `KIS 실패 로그에 상태 코드와 응답 메시지를 남긴다`(output: CapturedOutput) {
		given(lease.acquireOrRenew()).willReturn(true)
		given(pacer.awaitPermit()).willReturn(true)
		given(targetRepository.findAfter("", 2)).willReturn(listOf("005930"))
		given(client.fetch("005930")).willThrow(
			KisApiException(
				retryable = false,
				status = 400,
				code = "EGW00201",
				kisMsgCd = "EGW00201",
				kisMsg = "초당 거래건수를 초과하였습니다.",
			),
		)
		val collector = collector()

		collector.collect()

		assertThat(output).contains(
			"KIS 시세 수집 실패 stockCode=005930 retryable=false retryAfter=null " +
				"kisMsgCd=EGW00201 kisMsg=초당 거래건수를 초과하였습니다.",
		)
		assertThat(output).contains("KIS API 실패 status=400 code=EGW00201")
	}

	@Test
	fun `KST 장 운영시간이 지나면 임대와 KIS를 호출하지 않는다`() {
		val afterClose = Clock.fixed(Instant.parse("2026-09-07T06:30:01Z"), ZoneOffset.UTC)
		val collector = KisPriceCollector(
			client,
			targetRepository,
			cacheWriter,
			lease,
			pacer,
			batchSize = 2,
			minRequestInterval = Duration.ofMillis(50),
			cycleInterval = Duration.ofSeconds(3),
			staleAfter = Duration.ofSeconds(15),
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
			pacer,
			batchSize = 2,
			minRequestInterval = Duration.ofMillis(50),
			cycleInterval = Duration.ofSeconds(3),
			staleAfter = Duration.ofSeconds(15),
			clock = saturdayNoon,
		)

		collector.collect()

		verifyNoInteractions(lease, targetRepository, client, cacheWriter)
	}

	@Test
	fun `핫셋 한 바퀴 예상 시간이 stale 허용 시간을 넘으면 경고한다`(output: CapturedOutput) {
		given(lease.acquireOrRenew()).willReturn(true)
		given(targetRepository.countHotSet()).willReturn(301)
		given(targetRepository.findAfter("", 60)).willReturn(emptyList())
		val collector = KisPriceCollector(
			client,
			targetRepository,
			cacheWriter,
			lease,
			pacer,
			batchSize = 60,
			minRequestInterval = Duration.ofMillis(50),
			cycleInterval = Duration.ofSeconds(3),
			staleAfter = Duration.ofSeconds(15),
			clock = clock,
		)

		collector.collect()

		assertThat(output).contains("targetCount=301 batchSize=60 expectedPass=PT18S staleAfter=PT15S")
	}

	@Test
	fun `3초 주기에서 주입된 50ms 간격을 넘는 배치 크기는 거부한다`() {
		assertThatThrownBy {
			KisPriceCollector(
				client,
				targetRepository,
				cacheWriter,
				lease,
				pacer,
				batchSize = 61,
				minRequestInterval = Duration.ofMillis(50),
				cycleInterval = Duration.ofSeconds(3),
				staleAfter = Duration.ofSeconds(15),
				clock = clock,
			)
		}
			.isInstanceOf(IllegalArgumentException::class.java)
			.hasMessageContaining("60 이하여야")
	}

	private fun collector() =
		KisPriceCollector(
			client,
			targetRepository,
			cacheWriter,
			lease,
			pacer,
			batchSize = 2,
			minRequestInterval = Duration.ofMillis(50),
			cycleInterval = Duration.ofSeconds(3),
			staleAfter = Duration.ofSeconds(15),
			clock = clock,
		)
}
