package com.finch.domain.deposit.repository

import com.finch.domain.deposit.entity.Deposit
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

/**
 * `deposit` 은 deposit 소유다. `LedgerEntryRepository` 와 같은 이유로 `JpaRepository` 를
 * 상속하지 않는다 — 충전 취소가 없으므로(featureSpec 3.2) 삭제 진입점을 만들 이유도 없다.
 */
interface DepositRepository : Repository<Deposit, Long> {

	fun save(deposit: Deposit): Deposit

	/**
	 * 계좌의 충전액 합계. `account.total_deposited_amount` 와 **항상 같아야 한다** —
	 * 파생값(그쪽)과 원본(이쪽)의 대조가 불변식 검증의 한 축이다 (erd.md §4 불변식 6).
	 *
	 * 한도 판정에 쓰지 않는다. 판정은 잠금을 쥔 계좌의 파생값으로 하고, 이 합계는 검증용이다 —
	 * 매 요청에 SUM 을 돌리면 충전이 쌓일수록 느려진다.
	 */
	@Query("select coalesce(sum(d.amount), 0) from Deposit d where d.accountId = :accountId")
	fun sumAmountByAccountId(@Param("accountId") accountId: Long): Long
}
