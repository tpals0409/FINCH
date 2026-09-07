package com.finch.domain.price.service

import com.finch.domain.price.client.KisApiException
import com.finch.domain.price.client.KisPriceClient
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import java.time.Clock
import java.time.DayOfWeek
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/** 보유·관심·최근 본 핫셋을 정렬된 커서로 순회하며 KIS 현재가를 Redis에 적재한다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class KisPriceCollector internal constructor(
	private val client: KisPriceClient,
	private val targetRepository: PriceCollectionTargetRepository,
	private val cacheWriter: PriceCacheWriter,
	private val lease: PriceCollectorLease,
	private val pacer: KisRequestPacer,
	private val batchSize: Int,
	private val cycleInterval: Duration,
	private val staleAfter: Duration,
	private val clock: Clock,
) {

	@Autowired
	constructor(
		client: KisPriceClient,
		targetRepository: PriceCollectionTargetRepository,
		cacheWriter: PriceCacheWriter,
		lease: PriceCollectorLease,
		pacer: KisRequestPacer,
		@Value("\${KIS_PRICE_BATCH_SIZE}") batchSize: Int,
		@Value("\${finch.price.kis.cycle-interval}") cycleInterval: Duration,
		@Value("\${finch.price.stale-after}") staleAfter: Duration,
	) : this(client, targetRepository, cacheWriter, lease, pacer, batchSize, cycleInterval, staleAfter, Clock.systemUTC())

	private var cursor = ""
	private var pausedUntil = Instant.MIN

	init {
		require(batchSize > 0) { "KIS_PRICE_BATCH_SIZE는 1 이상이어야 합니다" }
		val maxBatchSize = cycleInterval.dividedBy(KisRequestPacer.MIN_INTERVAL)
		require(batchSize <= maxBatchSize) {
			"KIS_PRICE_BATCH_SIZE는 현재 주기와 50ms 호출 간격에서 $maxBatchSize 이하여야 합니다"
		}
	}

	@Scheduled(fixedRateString = "\${finch.price.kis.cycle-interval}")
	fun collect() {
		if (!isMarketOpen() || clock.instant().isBefore(pausedUntil) || !lease.acquireOrRenew()) return

		val targets = findNextTargets()

		for (stockCode in targets) {
			if (!lease.acquireOrRenew()) return
			if (!pacer.awaitPermit()) return
			try {
				cacheWriter.write(stockCode, client.fetch(stockCode))
				cursor = stockCode
			} catch (e: KisApiException) {
				e.retryAfter?.let { pausedUntil = clock.instant().plus(it) }
				log.warn("KIS 시세 수집 실패 stockCode={} retryable={} retryAfter={}", stockCode, e.retryable, e.retryAfter)
				if (e.retryable) return
				cursor = stockCode
			}
		}
	}

	private fun findNextTargets(): List<String> {
		if (cursor.isEmpty()) warnIfPassExceedsFreshness()
		val targets = targetRepository.findAfter(cursor, batchSize)
		if (targets.isNotEmpty() || cursor.isEmpty()) return targets

		cursor = ""
		warnIfPassExceedsFreshness()
		return targetRepository.findAfter(cursor, batchSize)
	}

	private fun warnIfPassExceedsFreshness() {
		val targetCount = targetRepository.countHotSet()
		if (targetCount == 0L) return
		val cycles = ((targetCount - 1) / batchSize) + 1
		val expectedPass = cycleInterval.multipliedBy(cycles)
		if (expectedPass > staleAfter) {
			log.warn(
				"KIS 핫셋 순회 예상 시간이 stale 허용 시간을 초과합니다 targetCount={} batchSize={} expectedPass={} staleAfter={}",
				targetCount,
				batchSize,
				expectedPass,
				staleAfter,
			)
		}
	}

	private fun isMarketOpen(): Boolean {
		val now = ZonedDateTime.ofInstant(clock.instant(), KST)
		if (now.dayOfWeek == DayOfWeek.SATURDAY || now.dayOfWeek == DayOfWeek.SUNDAY) return false
		// KRX 공휴일 달력은 별도 운영 데이터가 필요하므로 이 수집기의 정적 규칙에 포함하지 않는다.
		val time = now.toLocalTime()
		return !time.isBefore(MARKET_OPEN) && !time.isAfter(MARKET_CLOSE)
	}

	companion object {
		private val log = LoggerFactory.getLogger(KisPriceCollector::class.java)
		private val KST = ZoneId.of("Asia/Seoul")
		private val MARKET_OPEN = LocalTime.of(9, 0)
		private val MARKET_CLOSE = LocalTime.of(15, 30)
	}
}
