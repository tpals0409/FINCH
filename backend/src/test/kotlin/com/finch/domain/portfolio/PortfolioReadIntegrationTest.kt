package com.finch.domain.portfolio

import com.finch.TestcontainersConfiguration
import com.finch.domain.account.entity.Account
import com.finch.domain.account.service.AccountService
import com.finch.domain.auth.entity.User
import com.finch.domain.auth.repository.UserRepository
import com.finch.domain.portfolio.dto.PortfolioSort
import com.finch.domain.portfolio.service.PortfolioService
import com.finch.domain.price.service.PriceCacheWriter
import com.finch.domain.price.service.PriceTick
import com.finch.domain.stock.service.StockService
import java.time.OffsetDateTime
import java.util.concurrent.atomic.AtomicLong
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate

@Import(TestcontainersConfiguration::class)
@SpringBootTest
@Transactional
internal class PortfolioReadIntegrationTest @Autowired constructor(
	private val accountService: AccountService,
	private val portfolioService: PortfolioService,
	private val stockService: StockService,
	private val priceWriter: PriceCacheWriter,
	private val redisTemplate: StringRedisTemplate,
	private val userRepository: UserRepository,
	private val transactionTemplate: TransactionTemplate,
) {

	@AfterEach
	fun cleanRedis() {
		redisTemplate.delete(listOf("price:005930", "price:000660"))
	}

	@Test
	@DisplayName("매수 반영 뒤 포트폴리오·계좌·종목 상세가 같은 보유 평가를 돌려준다")
	fun reflectsBuyAcrossAllReadPaths() {
		val userId = openedAccount()
		buy(userId, "005930", quantity = 10, price = 71_200)
		priceWriter.write("005930", PriceTick(73_500, OffsetDateTime.now()))

		val portfolio = portfolioService.getPortfolio(userId, PortfolioSort.EVALUATION)
		val account = accountService.getSummary(userId)
		val detail = stockService.getDetail(userId, "005930", watched = false)
		val holding = portfolio.holdings.single()

		assertThat(portfolio.evaluationAmount).isEqualTo(735_000)
		assertThat(portfolio.totalAsset).isEqualTo(Account.INITIAL_GRANT_AMOUNT + 735_000)
		assertThat(holding.quantity).isEqualTo(10)
		assertThat(holding.stockName).isEqualTo("삼성전자")
		assertThat(holding.avgBuyPrice).isEqualTo(71_200)
		assertThat(holding.evaluationAmount).isEqualTo(735_000)
		assertThat(holding.evaluationProfit).isEqualTo(23_000)
		assertThat(holding.evaluationProfitRate).isEqualByComparingTo("3.23")
		assertThat(account.evaluationAmount).isEqualTo(portfolio.evaluationAmount)
		assertThat(account.totalAsset).isEqualTo(portfolio.totalAsset)
		assertThat(detail.holding?.evaluationProfit).isEqualTo(23_000)
		assertThat(detail.holding?.evaluationProfitRate).isEqualByComparingTo("3.23")
	}

	@Test
	@DisplayName("현재가가 없으면 보유는 남기고 평가값만 null로 내려 0원과 구분한다")
	fun preservesHoldingWhenPriceIsMissing() {
		val userId = openedAccount()
		buy(userId, "000660", quantity = 2, price = 150_000)

		val portfolio = portfolioService.getPortfolio(userId, PortfolioSort.EVALUATION)
		val account = accountService.getSummary(userId)
		val detail = stockService.getDetail(userId, "000660", watched = false)

		assertThat(portfolio.holdings.single().quantity).isEqualTo(2)
		assertThat(portfolio.holdings.single().currentPrice).isNull()
		assertThat(portfolio.holdings.single().evaluationAmount).isNull()
		assertThat(portfolio.evaluationAmount).isNull()
		assertThat(portfolio.totalAsset).isNull()
		assertThat(portfolio.asOf).isNull()
		assertThat(account.evaluationAmount).isNull()
		assertThat(account.totalAsset).isNull()
		assertThat(detail.holding?.quantity).isEqualTo(2)
		assertThat(detail.holding?.evaluationProfit).isNull()
	}

	@Test
	@DisplayName("전량 매도해 수량이 0인 잔존 행은 보유 응답에서 제외한다")
	fun excludesZeroQuantityRows() {
		val userId = openedAccount()
		buy(userId, "005930", quantity = 3, price = 70_000)
		sellAll(userId, "005930", quantity = 3, price = 71_000)

		val portfolio = portfolioService.getPortfolio(userId, PortfolioSort.EVALUATION)
		val detail = stockService.getDetail(userId, "005930", watched = false)

		assertThat(portfolio.holdings).isEmpty()
		assertThat(portfolio.evaluationAmount).isZero()
		assertThat(detail.holding).isNull()
	}

	private fun openedAccount(): Long =
		userRepository.save(User.register(KAKAO_ID.incrementAndGet(), "포트폴리오", null)).id!!
			.also(accountService::openAccountIfAbsent)

	private fun buy(userId: Long, stockCode: String, quantity: Long, price: Long) {
		val accountId = accountService.getAccountId(userId)
		transactionTemplate.executeWithoutResult { portfolioService.applyBuy(accountId, stockCode, quantity, price) }
	}

	private fun sellAll(userId: Long, stockCode: String, quantity: Long, price: Long) {
		val accountId = accountService.getAccountId(userId)
		transactionTemplate.executeWithoutResult {
			assertThat(portfolioService.applySell(accountId, stockCode, quantity, price)).isNotNull
		}
	}

	companion object {
		private val KAKAO_ID = AtomicLong(8_800_000_000)
	}
}
