package com.finch.domain.account.dto.response

import java.time.OffsetDateTime

/**
 * `GET /api/v1/account` 응답 본문 (apiSpec 3.1). 계좌 식별자를 내려보내지 않는다 (apiSpec 1.6).
 *
 * 보유 종목 중 현재가가 하나라도 없으면 평가금액·총자산·시세 기준 시각은 `null`이다.
 * 값 없음과 0원 평가를 구분해야 사용자가 불완전한 총자산을 실제 값으로 오인하지 않는다.
 */
data class AccountSummaryRes(
	val cashBalance: Long,
	val evaluationAmount: Long?,
	val totalAsset: Long?,
	val asOf: OffsetDateTime?,
)
