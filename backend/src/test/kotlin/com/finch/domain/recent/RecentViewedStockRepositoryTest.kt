package com.finch.domain.recent

import com.finch.TestcontainersConfiguration
import com.finch.domain.recent.repository.RecentViewedStockRepository
import com.finch.domain.recent.service.RecentViewedStockService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration::class)
class RecentViewedStockRepositoryTest {

	private var userId: Long = 0

	@Autowired
	private lateinit var repository: RecentViewedStockRepository

	@Autowired
	private lateinit var jdbcTemplate: JdbcTemplate

	@BeforeEach
	fun setUp() {
		jdbcTemplate.update(
			"INSERT INTO users (kakao_id, nickname, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
			999_000_001L,
			"recent-test",
		)
		userId = requireNotNull(jdbcTemplate.queryForObject("SELECT id FROM users WHERE kakao_id = 999000001", Long::class.java))
	}

	@Test
	@DisplayName("같은 사용자·종목을 다시 보면 중복 행 대신 viewed_at만 갱신한다")
	fun upsertDoesNotDuplicate() {
		repository.upsert(userId, "005930")
		val first = repository.findByUserIdOrderByViewedAtDescIdDesc(userId).single()

		repository.upsert(userId, "005930")
		val rows = repository.findByUserIdOrderByViewedAtDescIdDesc(userId)

		assertThat(rows).hasSize(1)
		assertThat(rows.single().id).isEqualTo(first.id)
	}

	@Test
	@DisplayName("최근 본 종목은 30건을 넘지 않고 최신 30건이 남는다")
	fun retainsLatestThirty() {
		val service = RecentViewedStockService(repository, mock(com.finch.domain.stock.service.StockService::class.java))

		(0 until 31).forEach { index ->
			service.record(userId, STOCK_CODES[index])
		}

		val rows = repository.findByUserIdOrderByViewedAtDescIdDesc(userId)

		assertThat(rows).hasSize(30)
		assertThat(rows.map { it.stockCode }).containsExactlyElementsOf(STOCK_CODES.take(31).drop(1).reversed())
	}

	companion object {
		private val STOCK_CODES = listOf(
			"000270", "000660", "000720", "000810", "005380", "005490", "005930", "009540",
			"011200", "012450", "015760", "017670", "033780", "035420", "035720", "039030",
			"041510", "042700", "051910", "055550", "058470", "068270", "105560", "145020",
			"196170", "207940", "214150", "240810", "247540", "263750", "293490", "373220",
		)
	}
}
