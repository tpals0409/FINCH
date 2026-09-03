package com.finch.domain.account.repository

import com.finch.domain.account.entity.Account
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

/**
 * `account` 는 account 소유다. 다른 도메인은 `AccountService` 를 거친다 (backConvention 2.2·규칙 3).
 *
 * `LedgerEntryRepository` 와 같은 이유로 `JpaRepository` 를 상속하지 않는다 —
 * 계좌 삭제는 어느 명세에도 없고(리셋도 없다), 상속하면 그 진입점이 공짜로 생긴다.
 */
interface AccountRepository : Repository<Account, Long> {

	fun save(account: Account): Account

	/** 조회 전용 경로. 잔액을 바꿀 것이면 [findByUserIdForUpdate] 를 쓴다. */
	fun findByUserId(userId: Long): Account?

	/**
	 * 예수금을 움직이기 전에 계좌 행을 잠근다 (`SELECT ... FOR UPDATE`).
	 *
	 * 잠금 없이 읽고 쓰면 동시 충전 둘이 같은 잔액을 읽고 각자 더해 하나가 사라진다.
	 * 멱등성 키는 **같은 키의** 중복만 막고 서로 다른 키의 동시 요청은 그대로 통과시키므로,
	 * 이 잠금이 없으면 잔액이 어긋나는 경로가 남는다.
	 *
	 * 잠금은 트랜잭션 끝까지 유지된다. 그래서 이 메서드로 잠근 뒤 한도를 검사하고 반영하는
	 * 세 단계가 원자적이다 — 검사와 반영 사이에 다른 요청이 끼어들 창이 없다.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select a from Account a where a.userId = :userId")
	fun findByUserIdForUpdate(@Param("userId") userId: Long): Account?
}
