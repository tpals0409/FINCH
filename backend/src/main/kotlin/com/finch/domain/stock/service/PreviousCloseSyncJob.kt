package com.finch.domain.stock.service

import com.finch.domain.stock.client.DailyCloseClient
import com.finch.domain.stock.repository.PreviousCloseRepository
import com.finch.domain.stock.repository.PreviousCloseUpdate
import java.time.Clock
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/** AI의 최근 거래일 종가로 종목 마스터의 등락 기준을 개장 전에 갱신한다. */
@Component
internal class PreviousCloseSyncJob internal constructor(
	private val client: DailyCloseClient,
	private val repository: PreviousCloseRepository,
	private val clock: Clock,
) {

	@Autowired
	constructor(
		client: DailyCloseClient,
		repository: PreviousCloseRepository,
	) : this(client, repository, Clock.systemUTC())

	@Scheduled(cron = "0 30 8 * * *", zone = "Asia/Seoul")
	fun sync() {
		val batch = client.fetchLatest()
		if (batch.items.isEmpty()) {
			log.warn("AI 일별 종가가 비어 있어 갱신하지 않는다 tradeDate={}", batch.tradeDate)
			return
		}

		val updates = batch.items
			.associateBy { it.stockCode }
			.values
			.map { PreviousCloseUpdate(it.stockCode, it.close) }
		val updated = repository.updateAll(updates, clock.instant())
		log.info(
			"전일 종가 갱신 완료 tradeDate={} received={} updated={}",
			batch.tradeDate,
			updates.size,
			updated,
		)
	}

	companion object {
		private val log = LoggerFactory.getLogger(PreviousCloseSyncJob::class.java)
	}
}
