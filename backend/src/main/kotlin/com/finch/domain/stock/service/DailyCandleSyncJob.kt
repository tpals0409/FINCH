package com.finch.domain.stock.service

import com.finch.domain.stock.client.CandleHistoryClient
import com.finch.domain.price.service.HotStockCodeReader
import com.finch.domain.stock.repository.DailyCandleWriter
import java.util.UUID
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.web.client.ResourceAccessException
import org.springframework.web.client.RestClientResponseException

/** 전역 핫셋의 최근 1년 일봉을 AI에서 받아 개장 전에 동기화한다. */
@Component
internal class DailyCandleSyncJob(
	private val client: CandleHistoryClient,
	private val targetReader: HotStockCodeReader,
	private val writer: DailyCandleWriter,
	@param:Value("\${finch.stock.candles.max-targets:30}") private val maxTargets: Int,
) {
	init {
		require(maxTargets in 1..MAX_TARGETS) { "캔들 동기화 대상 상한은 1..$MAX_TARGETS 범위여야 합니다" }
	}

	@Scheduled(cron = "\${finch.stock.candles.sync-cron:0 0 8 * * *}", zone = "Asia/Seoul")
	fun sync() {
		val correlationId = UUID.randomUUID().toString()
		MDC.putCloseable("correlationId", correlationId).use {
			val targets = targetReader.first(maxTargets)
			var succeeded = 0
			var failed = 0
			var changed = 0

			for (stockCode in targets) {
				try {
					val batch = client.fetch(stockCode)
					if (batch.candles.isNotEmpty()) changed += writer.upsert(stockCode, batch.candles)
					succeeded++
					log.info(
						"AI 캔들 동기화 완료 stockCode={} period={} status={} errorClass={} correlationId={} received={}",
						stockCode, CandleHistoryClient.PERIOD, 200, "NONE", correlationId, batch.candles.size,
					)
				} catch (e: Exception) {
					failed++
					val failure = classify(e)
					log.warn(
						"AI 캔들 동기화 실패 stockCode={} period={} status={} errorClass={} correlationId={}",
						stockCode, CandleHistoryClient.PERIOD, failure.status, failure.errorClass, correlationId, e,
					)
				}
			}

			log.info(
				"AI 캔들 동기화 종료 targets={} succeeded={} failed={} changed={} correlationId={}",
				targets.size, succeeded, failed, changed, correlationId,
			)
		}
	}

	private fun classify(exception: Exception): CandleSyncFailure = when (exception) {
		is RestClientResponseException -> CandleSyncFailure(exception.statusCode.value().toString(), "UPSTREAM_HTTP")
		is ResourceAccessException -> CandleSyncFailure("NONE", "NETWORK_ERROR")
		is IllegalArgumentException, is IllegalStateException -> CandleSyncFailure("200", "INVALID_RESPONSE")
		else -> CandleSyncFailure("NONE", "UNEXPECTED")
	}

	private data class CandleSyncFailure(val status: String, val errorClass: String)

	companion object {
		private const val MAX_TARGETS = 30
		private val log = LoggerFactory.getLogger(DailyCandleSyncJob::class.java)
	}
}
