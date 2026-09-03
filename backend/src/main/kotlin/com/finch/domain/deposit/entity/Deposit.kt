package com.finch.domain.deposit.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant

/**
 * `deposit` 테이블 (V2). 충전 1건의 상세다. 원장 1행 : 이 테이블 1행이고 `uq_deposit_ledger` 가
 * 그 1:1 을 지킨다.
 *
 * 충전 취소가 없으므로(featureSpec 1.1·3.2) 취소 상태 컬럼이 없다. 이 엔티티도 불변이다 —
 * 갱신 메서드가 없고 모든 컬럼이 `updatable = false` 다.
 *
 * `ledgerEntryId`·`accountId` 를 연관으로 걸지 않았다. deposit 은 4층이고 다른 도메인의 Entity 를
 * import 하지 않는다 (backConvention 2.4 규칙 3). FK 는 스키마가 갖는다.
 */
@Entity
@Table(name = "deposit")
class Deposit private constructor(
	ledgerEntryId: Long,
	accountId: Long,
	amount: Long,
	paymentMethod: PaymentMethod,
) {

	/** apiSpec 4.2 의 `depositId`. */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var ledgerEntryId: Long = ledgerEntryId
		private set

	/** 한도 재계산·감사용. 원장을 거치지 않고 계좌별 합계를 낼 수 있다 (V2). */
	@Column(nullable = false, updatable = false)
	final var accountId: Long = accountId
		private set

	@Column(nullable = false, updatable = false)
	final var amount: Long = amount
		private set

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false, length = 20)
	final var paymentMethod: PaymentMethod = paymentMethod
		private set

	@Column(nullable = false, updatable = false)
	final lateinit var createdAt: Instant
		private set

	@PrePersist
	private fun onCreate() {
		this.createdAt = Instant.now()
	}

	companion object {

		/**
		 * 1회 충전 한도 (apiSpec 4.2). `ck_deposit_amount` 가 DB 에서도 같은 값을 막는다 —
		 * 두 숫자가 갈리면 애플리케이션이 통과시킨 요청이 제약 위반 500 으로 끝난다.
		 */
		const val PER_REQUEST_LIMIT: Long = 10_000_000

		/**
		 * 계정 누적 충전 한도 (apiSpec 4.1). `ck_account_total_deposited` 의 상한과 같은 값이다.
		 *
		 * 회차가 없어지면서 기준 기간이 회차가 아니라 **계좌 평생**이 됐고, 한도를 되돌릴 경로도
		 * 함께 없어졌다 (V2 머리말).
		 */
		const val CUMULATIVE_LIMIT: Long = 100_000_000

		fun of(
			ledgerEntryId: Long,
			accountId: Long,
			amount: Long,
			paymentMethod: PaymentMethod,
		): Deposit = Deposit(ledgerEntryId, accountId, amount, paymentMethod)
	}
}
