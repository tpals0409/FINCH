package com.finch.domain.stock.service

import com.finch.domain.stock.client.DailyCloseBatch
import com.finch.domain.stock.client.DailyCloseClient
import com.finch.domain.stock.client.DailyCloseItem
import com.finch.domain.stock.repository.PreviousCloseRepository
import com.finch.domain.stock.repository.PreviousCloseUpdate
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
import org.springframework.scheduling.annotation.Scheduled

@ExtendWith(MockitoExtension::class, OutputCaptureExtension::class)
internal class PreviousCloseSyncJobTest {

	@Mock
	private lateinit var client: DailyCloseClient

	@Mock
	private lateinit var repository: PreviousCloseRepository

	private val now = Instant.parse("2026-09-08T00:00:00Z")
	private val clock = Clock.fixed(now, ZoneOffset.UTC)

	@Test
	@DisplayName("tradeDate와 items가 모두 비면 기존 종목을 건드리지 않고 WARN을 남긴다")
	fun skipsEmptyBatch(output: CapturedOutput) {
		given(client.fetchLatest()).willReturn(DailyCloseBatch(null, emptyList()))

		PreviousCloseSyncJob(client, repository, clock).sync()

		verifyNoInteractions(repository)
		assertThat(output.out).contains("AI 일별 종가가 비어 있어 갱신하지 않는다")
	}

	@Test
	@DisplayName("중복 종목을 하나로 모아 AI가 준 항목과 실행 시각만 저장소에 넘긴다")
	fun updatesReceivedItems() {
		given(client.fetchLatest()).willReturn(
			DailyCloseBatch(
				LocalDate.parse("2026-09-07"),
				listOf(
					DailyCloseItem("005930", 73_400),
					DailyCloseItem("005930", 73_500),
					DailyCloseItem("000660", 270_000),
				),
			),
		)

		PreviousCloseSyncJob(client, repository, clock).sync()

		verify(repository).updateAll(
			listOf(
				PreviousCloseUpdate("005930", 73_500),
				PreviousCloseUpdate("000660", 270_000),
			),
			now,
		)
	}

	@Test
	@DisplayName("스케줄은 기본값을 유지하면서 프로퍼티로 조정할 수 있다")
	fun schedulesBeforeMarketOpen() {
		val scheduled = PreviousCloseSyncJob::class.java.getDeclaredMethod("sync")
			.getAnnotation(Scheduled::class.java)

		assertThat(scheduled.cron).isEqualTo("\${finch.stock.previous-close.sync-cron:0 30 8 * * *}")
		assertThat(scheduled.zone).isEqualTo("Asia/Seoul")
	}
}
