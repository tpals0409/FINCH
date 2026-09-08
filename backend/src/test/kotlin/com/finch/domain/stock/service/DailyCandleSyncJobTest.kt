package com.finch.domain.stock.service

import com.finch.domain.stock.client.CandleHistoryBatch
import com.finch.domain.stock.client.CandleHistoryClient
import com.finch.domain.stock.client.CandleHistoryItem
import com.finch.domain.price.service.HotStockCodeReader
import com.finch.domain.stock.repository.DailyCandleWriter
import java.time.LocalDate
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
import org.springframework.web.client.ResourceAccessException

@ExtendWith(MockitoExtension::class, OutputCaptureExtension::class)
internal class DailyCandleSyncJobTest {
	@Mock private lateinit var client: CandleHistoryClient
	@Mock private lateinit var targets: HotStockCodeReader
	@Mock private lateinit var writer: DailyCandleWriter

	@Test
	fun `한 종목 실패가 다음 종목 적재를 막지 않고 로그로 분류된다`(output: CapturedOutput) {
		val candle = CandleHistoryItem(LocalDate.parse("2026-09-07"), 70, 73, 69, 72, 20)
		given(targets.first(30)).willReturn(listOf("005930", "000660"))
		given(client.fetch("005930")).willThrow(ResourceAccessException("connection reset"))
		given(client.fetch("000660")).willReturn(CandleHistoryBatch("000660", "1Y", "DAY", listOf(candle)))
		given(writer.upsert("000660", listOf(candle))).willReturn(1)

		DailyCandleSyncJob(client, targets, writer, 30).sync()

		verify(writer).upsert("000660", listOf(candle))
		assertThat(output).contains("stockCode=005930 period=1Y status=NONE errorClass=NETWORK_ERROR")
		assertThat(output).containsPattern("correlationId=[0-9a-f-]{36}")
		assertThat(output).contains("targets=2 succeeded=1 failed=1 changed=1")
	}

	@Test
	fun `빈 응답은 쓰기 없이 다음 실행을 기다린다`() {
		given(targets.first(30)).willReturn(listOf("005930"))
		given(client.fetch("005930")).willReturn(CandleHistoryBatch("005930", "1Y", "DAY", emptyList()))

		DailyCandleSyncJob(client, targets, writer, 30).sync()

		verify(writer, never()).upsert("005930", emptyList())
	}
}
