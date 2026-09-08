package com.finch.domain.stock.repository

import com.finch.TestcontainersConfiguration
import java.sql.Timestamp
import java.time.Instant
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate

/** 실제 PostgreSQL에서 한 문장 일괄 갱신·부분 응답 보존·멱등성을 검증한다. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration::class, PreviousCloseRepository::class)
internal class PreviousCloseRepositoryTest @Autowired constructor(
	private val repository: PreviousCloseRepository,
	private val jdbcTemplate: JdbcTemplate,
) {

	@Test
	@DisplayName("응답에 있는 종목만 한 번 갱신하고 같은 배치를 다시 실행하면 아무 행도 바뀌지 않는다")
	fun updatesOnlyChangedKnownStocks() {
		val old = Instant.parse("2026-09-07T00:00:00Z")
		val firstRun = Instant.parse("2026-09-08T00:00:00Z")
		val secondRun = Instant.parse("2026-09-09T00:00:00Z")
		setStock("005930", 257_000, old)
		setStock("000050", null, old)
		setStock("000660", 222_000, old)
		val updates = listOf(
			PreviousCloseUpdate("005930", 73_500),
			PreviousCloseUpdate("000050", 12_300),
			PreviousCloseUpdate("999999", 1),
		)

		assertThat(repository.updateAll(updates, firstRun)).isEqualTo(2)
		assertThat(previousClose("005930")).isEqualTo(73_500)
		assertThat(previousClose("000050")).isEqualTo(12_300)
		assertThat(previousClose("000660")).isEqualTo(222_000)
		assertThat(updatedAt("000660")).isEqualTo(old)

		assertThat(repository.updateAll(updates, secondRun)).isZero()
		assertThat(updatedAt("005930")).isEqualTo(firstRun)
		assertThat(updatedAt("000050")).isEqualTo(firstRun)
	}

	private fun setStock(stockCode: String, previousClose: Long?, updatedAt: Instant) {
		jdbcTemplate.update(
			"UPDATE stock SET previous_close = ?, updated_at = ? WHERE stock_code = ?",
			previousClose,
			Timestamp.from(updatedAt),
			stockCode,
		)
	}

	private fun previousClose(stockCode: String): Long? =
		jdbcTemplate.queryForObject(
			"SELECT previous_close FROM stock WHERE stock_code = ?",
			Long::class.java,
			stockCode,
		)

	private fun updatedAt(stockCode: String): Instant =
		jdbcTemplate.queryForObject(
			"SELECT updated_at FROM stock WHERE stock_code = ?",
			Timestamp::class.java,
			stockCode,
		)!!.toInstant()
}
