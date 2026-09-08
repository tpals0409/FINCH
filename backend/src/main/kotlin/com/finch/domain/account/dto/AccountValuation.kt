package com.finch.domain.account.dto

import java.time.OffsetDateTime

/** 계좌 요약에 붙는 포트폴리오 평가 결과. 계좌 식별자는 API로 내보내지 않는다. */
data class AccountValuation(
	val evaluationAmount: Long?,
	val asOf: OffsetDateTime?,
)
