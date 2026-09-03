package com.finch.domain.ledger.entity

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
 * `ledger_entry` 테이블 (V2). ledger 도메인이 소유한다.
 *
 * **이 엔티티는 불변이다.** 갱신 메서드가 없고 모든 컬럼이 `updatable = false` 다 —
 * Hibernate 가 UPDATE 문에서 컬럼을 아예 제외하므로, 누가 필드를 바꿀 길을 찾아내도 DB 에 닿지 않는다.
 * 정정은 반대 분개로 한다 (backConvention 6장). 규칙을 지켜달라고 적는 것과 매핑이 지키는 것은 다르다.
 *
 * **`account_id` 를 `@ManyToOne` 으로 두지 않았다.** ledger 는 1층(피참조 전용)이고 `account` 는
 * 2층이라, 연관을 걸면 참조 방향이 역류한다 (backConvention 2.4 규칙 2). FK 는 스키마의
 * `fk_ledger_account` 가 갖고 여기서는 식별자만 든다.
 *
 * `data class` 로 만들지 않는 이유는 [com.finch.domain.auth.entity.User] 와 같다.
 */
@Entity
@Table(name = "ledger_entry")
class LedgerEntry private constructor(
	accountId: Long,
	type: LedgerType,
	cashDelta: Long,
	cashBalanceAfter: Long,
	occurredAt: Instant,
) {

	/** apiSpec 8.2 의 `transactionId` 이자 커서 페이징의 커서 값이다. */
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var accountId: Long = accountId
		private set

	/**
	 * `VARCHAR(16)` 에 이름 문자열로 들어간다. `EnumType.ORDINAL` 이면 enum 상수 순서를 바꾸는 것만으로
	 * 과거 원장의 뜻이 달라진다 — 불변 테이블에 그런 축을 두지 않는다.
	 */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, updatable = false, length = 16)
	final var type: LedgerType = type
		private set

	/** 예수금 증감. INITIAL_GRANT +1,000,000 / DEPOSIT + / BUY − / SELL +. */
	@Column(nullable = false, updatable = false)
	final var cashDelta: Long = cashDelta
		private set

	/**
	 * 기록 직후 예수금. `account.cash_balance` 와 **항상 같아야 한다.**
	 * 그 짝을 맞추는 책임은 `AccountService.post` 하나에 있다 — 여기서는 받은 값을 그대로 적는다.
	 */
	@Column(nullable = false, updatable = false)
	final var cashBalanceAfter: Long = cashBalanceAfter
		private set

	/**
	 * 사건이 일어난 시각. `created_at`(행이 삽입된 시각)과 나눠 둔 이유는 주문이다 —
	 * 체결 시각은 `trade.executed_at` 과 같은 값이어야 하고, 그 값은 호출자가 만든다.
	 */
	@Column(nullable = false, updatable = false)
	final var occurredAt: Instant = occurredAt
		private set

	@Column(nullable = false, updatable = false)
	final lateinit var createdAt: Instant
		private set

	/** `User` 와 같은 이유로 JPA Auditing 을 쓰지 않는다 — 전 도메인이 상속할 결정이라 엔티티에서 끝냈다. */
	@PrePersist
	private fun onCreate() {
		this.createdAt = Instant.now()
	}

	companion object {
		/**
		 * **`LedgerService.record` 만 부른다.** 다른 자리에서 부르면 예수금을 움직이지 않고
		 * 원장만 쓸 수 있고, 그 순간 `cash_balance_after` 가 거짓이 된다.
		 */
		fun of(
			accountId: Long,
			type: LedgerType,
			cashDelta: Long,
			cashBalanceAfter: Long,
			occurredAt: Instant,
		): LedgerEntry = LedgerEntry(accountId, type, cashDelta, cashBalanceAfter, occurredAt)
	}
}
