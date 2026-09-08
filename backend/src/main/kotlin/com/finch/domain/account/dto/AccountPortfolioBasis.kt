package com.finch.domain.account.dto

/** portfolio 조회가 account 도메인에서 받는 내부 기준값. 계좌 식별자는 API로 내보내지 않는다. */
data class AccountPortfolioBasis(
	val accountId: Long,
	val cashBalance: Long,
)
