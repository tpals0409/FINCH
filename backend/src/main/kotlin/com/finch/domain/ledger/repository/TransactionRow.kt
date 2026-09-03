package com.finch.domain.ledger.repository

import java.time.Instant

/**
 * `GET /transactions` 조회 결과의 한 행. 네이티브 쿼리의 인터페이스 프로젝션이다.
 *
 * **엔티티가 아니라 프로젝션인 것이 요점이다.** 이 조회는 `ledger_entry`·`account`·`deposit` 을
 * 함께 읽어야 하는데(erd.md §5), 엔티티로 받으면 ledger 가 다른 도메인의 Entity 를 import 하게 된다.
 * backConvention 2.4 규칙 4 가 이 경우를 위해 조회 전용 조인을 열어 두었고, 조건이
 * "DTO 프로젝션으로 조인 결과만 받는다" 다.
 */
interface TransactionRow {
	val transactionId: Long
	val type: String
	val occurredAt: Instant
	val amount: Long
	val paymentMethod: String?
}
