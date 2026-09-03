package com.finch.domain.account.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant

/**
 * `account` 테이블 (V2). 사용자당 정확히 하나이고 계정 생성과 함께 만들어진다 (apiSpec 1.6).
 *
 * **`user_id` 를 `@ManyToOne` 으로 두지 않았다.** `auth` 와 `account` 는 같은 2층이고 같은 층 사이의
 * 참조는 순환을 만들 수 있어 금지다 (backConvention 2.4 규칙 2). FK 는 스키마의 `fk_account_user` 가
 * 갖고 여기서는 식별자만 든다.
 *
 * 리셋과 투자 회차가 없으므로 `round_no`·`status`·`closed_at`·`final_total_asset` 이 없다 (V2 머리말).
 */
@Entity
@Table(name = "account")
class Account private constructor(
	userId: Long,
) {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var userId: Long = userId
		private set

	/**
	 * 예수금 스냅샷. **원장이 진실이고 이 값은 파생이다** (erd.md 1.3) — 같은 트랜잭션에서만 갱신되고
	 * `Σ ledger_entry.cash_delta` 와 항상 같아야 한다.
	 *
	 * 파생값을 두는 이유는 조회다. 잔고 화면마다 원장 전체를 합치면 행이 쌓일수록 느려진다.
	 */
	@Column(nullable = false)
	final var cashBalance: Long = 0
		private set

	/**
	 * 계정 전체 누적 충전액. **초기 지급은 포함하지 않는다** — 충전 한도의 기준이고,
	 * 초기 지급을 섞으면 `GET /deposits/limit` 의 `depositedAmount` 가 `type=DEPOSIT` 내역 합계와
	 * 어긋난다 (apiSpec 8.2).
	 *
	 * 회차가 없어졌으므로 한도의 기준 기간도 회차가 아니라 계좌 평생이다.
	 */
	@Column(nullable = false)
	final var totalDepositedAmount: Long = 0
		private set

	@Column(nullable = false, updatable = false)
	final lateinit var createdAt: Instant
		private set

	@Column(nullable = false)
	final lateinit var updatedAt: Instant
		private set

	/**
	 * 예수금을 옮기고 옮긴 뒤의 잔액을 돌려준다. 그 반환값이 `ledger_entry.cash_balance_after` 가 된다.
	 *
	 * **음수 잔액을 여기서 막지 않는다.** `ck_account_cash_balance` 가 DB 에서 막는다 —
	 * 애플리케이션에도 같은 검사를 두면 방어선이 둘로 갈려 어느 날 하나만 고쳐진다.
	 *
	 * `AccountService` 밖에서 부르지 않는다. 잔액만 옮기고 원장을 안 쓰면 그 순간 파생값이 거짓이 된다.
	 */
	fun applyCashDelta(delta: Long): Long {
		this.cashBalance += delta
		return this.cashBalance
	}

	/** 충전에서만 부른다. 예수금 반영(`applyCashDelta`)과 짝이며 같은 트랜잭션에 있어야 한다. */
	fun addDeposited(amount: Long) {
		this.totalDepositedAmount += amount
	}

	/** `User` 와 같은 이유로 JPA Auditing 을 쓰지 않는다. */
	@PrePersist
	private fun onCreate() {
		val now = Instant.now()
		this.createdAt = now
		this.updatedAt = now
	}

	@PreUpdate
	private fun onUpdate() {
		this.updatedAt = Instant.now()
	}

	companion object {

		/**
		 * 최초 로그인 시 1회 지급액 (featureSpec 2.2).
		 *
		 * 계좌를 이 금액으로 만들지 않고 **0 으로 만든 뒤 원장을 통해 넣는다.** 그래야
		 * `Σ cash_delta == cash_balance` 가 계좌의 첫 순간부터 성립하고, 그 불변식을 검사하는
		 * 테스트가 초기 지급을 예외로 다루지 않아도 된다.
		 */
		const val INITIAL_GRANT_AMOUNT: Long = 1_000_000

		/** 계좌 개설. 중복 개설의 방어선은 스키마의 `uq_account_user` 다 (AuthService 주석 참고). */
		fun open(userId: Long): Account = Account(userId)
	}
}
