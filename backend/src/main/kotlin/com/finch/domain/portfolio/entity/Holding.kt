package com.finch.domain.portfolio.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * `holding` 테이블 (V2). 계좌가 들고 있는 종목 한 줄이다.
 *
 * **전량 매도해도 행을 지우지 않는다.** `quantity = 0`, `avg_buy_price = 0` 으로 남긴다 —
 * 재매수 때 같은 행을 갱신하면 INSERT 경합이 없다. 스키마의 `ck_holding_zeroed` 가 그 상태만
 * 허용한다. **API 는 수량 0 을 보유로 취급하지 않는다** (apiSpec 5.2 · 이슈 #19).
 *
 * `account_id`·`stock_code` 를 연관으로 걸지 않는다. FK 는 스키마가 갖는다
 * (backConvention 2.4 규칙 3).
 */
@Entity
@Table(name = "holding")
class Holding private constructor(
	accountId: Long,
	stockCode: String,
) {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var accountId: Long = accountId
		private set

	/** 스키마가 `CHAR(6)` 이다 (`Stock.stockCode` 와 같은 이유). */
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(nullable = false, updatable = false, length = 6)
	final var stockCode: String = stockCode
		private set

	@Column(nullable = false)
	final var quantity: Long = 0
		private set

	/** 가중평균 매입 단가. 매수마다 다시 계산된다. */
	@Column(nullable = false)
	final var avgBuyPrice: Long = 0
		private set

	@Column(nullable = false)
	final lateinit var updatedAt: Instant
		private set

	@PrePersist
	@PreUpdate
	private fun touch() {
		updatedAt = Instant.now()
	}

	/**
	 * 매수 반영. 평단을 가중평균으로 다시 낸다.
	 *
	 * **정수 나눗셈이라 원 단위로 내림된다.** 평단은 표시와 실현손익 계산에만 쓰이고 예수금을
	 * 움직이지 않으므로, 여기서 생기는 1원 미만 오차가 원장 잔액을 어긋나게 하지 않는다.
	 * 반대로 소수로 들고 있으면 화면·계산마다 반올림 위치가 달라진다.
	 */
	fun buy(quantity: Long, price: Long) {
		val totalCost = this.quantity * this.avgBuyPrice + quantity * price
		this.quantity += quantity
		this.avgBuyPrice = totalCost / this.quantity
	}

	/**
	 * 매도 반영. 실현손익을 돌려준다 — `(체결가 − 평단) × 수량` 이다.
	 *
	 * **평단은 매도로 바뀌지 않는다.** 남은 수량의 취득 원가가 그대로이기 때문이다.
	 * 전량 매도면 둘 다 0 으로 내린다 (`ck_holding_zeroed`).
	 */
	fun sell(quantity: Long, price: Long): Long {
		val realized = (price - this.avgBuyPrice) * quantity
		this.quantity -= quantity
		if (this.quantity == 0L) this.avgBuyPrice = 0
		return realized
	}

	companion object {
		fun of(accountId: Long, stockCode: String): Holding = Holding(accountId, stockCode)
	}
}
