package com.finch.domain.price.repository

import com.finch.TestcontainersConfiguration
import java.util.concurrent.atomic.AtomicLong
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.transaction.annotation.Transactional

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@Transactional
internal class PriceCollectionTargetRepositoryTest @Autowired constructor(
	private val jdbcClient: JdbcClient,
) {

	private val repository = PriceCollectionTargetRepository(jdbcClient)

	@Test
	fun `보유 관심 최근 본 종목의 합집합만 커서 순회하고 수량 0 보유는 제외한다`() {
		val userId = insertUser()
		val accountId = insertAccount(userId)
		insertHolding(accountId, "005930", quantity = 3, avgBuyPrice = 70_000)
		insertHolding(accountId, "000660", quantity = 0, avgBuyPrice = 0)
		insertWatchlist(userId, "005930")
		insertWatchlist(userId, "001040")
		insertRecentViewed(userId, "001060")

		assertThat(repository.countHotSet()).isEqualTo(3)
		assertThat(repository.findAfter("", 2)).containsExactly("001040", "001060")
		assertThat(repository.findAfter("001040", 10)).containsExactly("001060", "005930")
	}

	private fun insertUser(): Long =
		jdbcClient.sql(
			"""
			INSERT INTO users (kakao_id, nickname, created_at, updated_at)
			VALUES (:kakaoId, '핫셋', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			RETURNING id
			""".trimIndent(),
		)
			.param("kakaoId", KAKAO_ID.incrementAndGet())
			.query { resultSet, _ -> resultSet.getLong("id") }
			.single()

	private fun insertAccount(userId: Long): Long =
		jdbcClient.sql(
			"""
			INSERT INTO account (user_id, cash_balance, total_deposited_amount, created_at, updated_at)
			VALUES (:userId, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			RETURNING id
			""".trimIndent(),
		)
			.param("userId", userId)
			.query { resultSet, _ -> resultSet.getLong("id") }
			.single()

	private fun insertHolding(accountId: Long, stockCode: String, quantity: Long, avgBuyPrice: Long) {
		jdbcClient.sql(
			"""
			INSERT INTO holding (account_id, stock_code, quantity, avg_buy_price, updated_at)
			VALUES (:accountId, :stockCode, :quantity, :avgBuyPrice, CURRENT_TIMESTAMP)
			""".trimIndent(),
		)
			.param("accountId", accountId)
			.param("stockCode", stockCode)
			.param("quantity", quantity)
			.param("avgBuyPrice", avgBuyPrice)
			.update()
	}

	private fun insertWatchlist(userId: Long, stockCode: String) {
		jdbcClient.sql(
			"""
			INSERT INTO watchlist_item (user_id, stock_code, created_at)
			VALUES (:userId, :stockCode, CURRENT_TIMESTAMP)
			""".trimIndent(),
		)
			.param("userId", userId)
			.param("stockCode", stockCode)
			.update()
	}

	private fun insertRecentViewed(userId: Long, stockCode: String) {
		jdbcClient.sql(
			"""
			INSERT INTO recent_viewed_stock (user_id, stock_code, viewed_at)
			VALUES (:userId, :stockCode, CURRENT_TIMESTAMP)
			""".trimIndent(),
		)
			.param("userId", userId)
			.param("stockCode", stockCode)
			.update()
	}

	companion object {
		private val KAKAO_ID = AtomicLong(950_000_000_000L)
	}
}
