package com.finch.domain.portfolio

import com.finch.domain.portfolio.entity.Holding
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * 평단과 실현손익 (apiSpec 7.2 의 5번). 돈이 걸린 계산이라 순수 단위로 잠근다.
 *
 * 스프링을 띄우지 않는다 — 엔티티 안의 산수라 컨테이너를 기다릴 이유가 없다.
 */
class HoldingTest {

	private fun holding() = Holding.of(accountId = 1, stockCode = "005930")

	@Test
	@DisplayName("첫 매수의 평단은 체결가 그대로다")
	fun firstBuy() {
		val h = holding()
		h.buy(quantity = 10, price = 70_000)

		assertThat(h.quantity).isEqualTo(10)
		assertThat(h.avgBuyPrice).isEqualTo(70_000)
	}

	@Test
	@DisplayName("추가 매수는 가중평균이다 — 수량이 많은 쪽으로 끌린다")
	fun weightedAverage() {
		val h = holding()
		h.buy(10, 70_000)   // 700,000
		h.buy(30, 80_000)   // 2,400,000 → 합 3,100,000 / 40주 = 77,500

		assertThat(h.quantity).isEqualTo(40)
		assertThat(h.avgBuyPrice).isEqualTo(77_500)
	}

	/**
	 * 정수 나눗셈이라 원 단위로 내림된다. 평단은 예수금을 움직이지 않으므로 이 오차가
	 * 원장 잔액을 어긋나게 하지 않는다 — `Holding.buy` 주석의 근거를 잠근다.
	 */
	@Test
	@DisplayName("평단은 원 단위로 내림한다")
	fun floorsToWon() {
		val h = holding()
		h.buy(3, 10_000)   // 30,000 / 3 = 10,000
		h.buy(1, 10_001)   // 40,001 / 4 = 10,000.25 → 10,000

		assertThat(h.avgBuyPrice).isEqualTo(10_000)
	}

	@Test
	@DisplayName("매도 실현손익은 (체결가 − 평단) × 수량 이고 평단은 그대로다")
	fun sellRealizesProfit() {
		val h = holding()
		h.buy(10, 70_000)

		val realized = h.sell(quantity = 4, price = 75_000)

		assertThat(realized).isEqualTo(20_000)      // (75,000 − 70,000) × 4
		assertThat(h.quantity).isEqualTo(6)
		// 남은 수량의 취득 원가는 안 바뀐다
		assertThat(h.avgBuyPrice).isEqualTo(70_000)
	}

	@Test
	@DisplayName("손실 매도는 음수를 낸다")
	fun sellAtLoss() {
		val h = holding()
		h.buy(10, 70_000)

		assertThat(h.sell(10, 65_000)).isEqualTo(-50_000)
	}

	/**
	 * 전량 매도해도 행을 지우지 않고 0 으로 내린다. 스키마의 `ck_holding_zeroed` 가
	 * `quantity > 0 OR avg_buy_price = 0` 만 허용하므로, 평단을 0 으로 안 내리면 INSERT 가 막힌다.
	 */
	@Test
	@DisplayName("전량 매도하면 수량과 평단이 함께 0 이 된다")
	fun sellAllZeroesBoth() {
		val h = holding()
		h.buy(10, 70_000)
		h.sell(10, 75_000)

		assertThat(h.quantity).isEqualTo(0)
		assertThat(h.avgBuyPrice).isEqualTo(0)
	}

	@Test
	@DisplayName("전량 매도 후 재매수는 새 평단으로 시작한다")
	fun rebuyAfterFullSell() {
		val h = holding()
		h.buy(10, 70_000)
		h.sell(10, 75_000)
		h.buy(5, 90_000)

		assertThat(h.quantity).isEqualTo(5)
		assertThat(h.avgBuyPrice).isEqualTo(90_000)
	}
}
