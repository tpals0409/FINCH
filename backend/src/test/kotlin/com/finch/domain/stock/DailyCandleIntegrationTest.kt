package com.finch.domain.stock

import com.finch.TestcontainersConfiguration
import com.finch.domain.stock.client.CandleHistoryItem
import com.finch.domain.stock.entity.CandlePeriod
import com.finch.domain.stock.repository.DailyCandleWriter
import com.finch.domain.stock.service.StockService
import java.time.LocalDate
import java.time.ZoneId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate

@Import(TestcontainersConfiguration::class)
@SpringBootTest
internal class DailyCandleIntegrationTest @Autowired constructor(
	private val writer: DailyCandleWriter,
	private val stockService: StockService,
	private val jdbcTemplate: JdbcTemplate,
) {
	private val today = LocalDate.now(ZoneId.of("Asia/Seoul"))

	@AfterEach
	fun clean() {
		jdbcTemplate.update("DELETE FROM daily_candle WHERE stock_code = ?", "005930")
	}

	@Test
	fun `같은 일봉을 다시 적재하면 변경 0행이고 바뀐 값만 갱신한다`() {
		val original = listOf(candle(today.minusDays(2), 72), candle(today.minusDays(1), 73))

		assertThat(writer.upsert("005930", original)).isEqualTo(2)
		assertThat(writer.upsert("005930", original)).isZero()
		assertThat(writer.upsert("005930", listOf(candle(today.minusDays(1), 74)))).isEqualTo(1)

		val response = stockService.getCandles("005930", CandlePeriod.`1M`)
		assertThat(response.candles.map { it.close }).containsExactly(72, 74)
	}

	@Test
	fun `1M 3M 1Y는 각 달력 경계 안의 일봉을 날짜순으로 돌려준다`() {
		writer.upsert(
			"005930",
			listOf(candle(today.minusDays(200), 70), candle(today.minusDays(60), 71), candle(today.minusDays(20), 72)),
		)

		assertThat(stockService.getCandles("005930", CandlePeriod.`1M`).candles.map { it.close })
			.containsExactly(72)
		assertThat(stockService.getCandles("005930", CandlePeriod.`3M`).candles.map { it.close })
			.containsExactly(71, 72)
		assertThat(stockService.getCandles("005930", CandlePeriod.`1Y`).candles.map { it.close })
			.containsExactly(70, 71, 72)
	}

	private fun candle(date: LocalDate, close: Long) =
		CandleHistoryItem(date, close - 1, close + 1, close - 2, close, 100)
}
