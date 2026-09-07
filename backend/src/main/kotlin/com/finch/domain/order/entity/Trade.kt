package com.finch.domain.order.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * `trade` 테이블 (V2). 체결 한 건이다. MVP 는 시장가 즉시 체결이라 접수와 체결이 나뉘지 않는다.
 *
 * **원장 행과 1:1 이다** (`uq_trade_ledger`). 체결이 원장을 거치지 않고 생길 수 없다는 뜻이고,
 * 그래서 `ledgerEntryId` 가 `updatable = false` 다.
 *
 * `avgBuyPrice` 는 매도 때만 채운다 — 체결 **직전** 평단의 스냅샷이다. 평단은 매도 후 바뀌므로
 * 이 값이 없으면 과거 수익률을 재현할 수 없다 (V1 주석).
 */
@Entity
@Table(name = "trade")
class Trade private constructor(
	ledgerEntryId: Long,
	accountId: Long,
	stockCode: String,
	side: OrderSide,
	quantity: Long,
	executedPrice: Long,
	avgBuyPrice: Long?,
	realizedProfit: Long?,
	executedAt: Instant,
) {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var ledgerEntryId: Long = ledgerEntryId
		private set

	@Column(nullable = false, updatable = false)
	final var accountId: Long = accountId
		private set

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(nullable = false, updatable = false, length = 6)
	final var stockCode: String = stockCode
		private set

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false, length = 4)
	final var side: OrderSide = side
		private set

	@Column(nullable = false, updatable = false)
	final var quantity: Long = quantity
		private set

	@Column(nullable = false, updatable = false)
	final var executedPrice: Long = executedPrice
		private set

	/** `수량 × 체결가`. 계산해서 낼 수 있지만 스키마가 컬럼으로 갖는다 — 원장 금액과 대조하는 값이다. */
	@Column(nullable = false, updatable = false)
	final var executedAmount: Long = quantity * executedPrice
		private set

	@Column(updatable = false)
	final var avgBuyPrice: Long? = avgBuyPrice
		private set

	@Column(updatable = false)
	final var realizedProfit: Long? = realizedProfit
		private set

	@Column(nullable = false, updatable = false)
	final var executedAt: Instant = executedAt
		private set

	companion object {
		fun buy(
			ledgerEntryId: Long,
			accountId: Long,
			stockCode: String,
			quantity: Long,
			price: Long,
			at: Instant,
		): Trade = Trade(ledgerEntryId, accountId, stockCode, OrderSide.BUY, quantity, price, null, null, at)

		fun sell(
			ledgerEntryId: Long,
			accountId: Long,
			stockCode: String,
			quantity: Long,
			price: Long,
			avgBuyPrice: Long,
			realizedProfit: Long,
			at: Instant,
		): Trade =
			Trade(ledgerEntryId, accountId, stockCode, OrderSide.SELL, quantity, price, avgBuyPrice, realizedProfit, at)
	}
}
