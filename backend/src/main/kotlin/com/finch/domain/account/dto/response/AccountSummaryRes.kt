package com.finch.domain.account.dto.response

import java.time.OffsetDateTime

/**
 * `GET /api/v1/account` 응답 본문 (apiSpec 3.1). 계좌 식별자를 내려보내지 않는다 (apiSpec 1.6).
 *
 * ⚠️ **`evaluationAmount` 는 지금 항상 0 이다. 보유가 없어서가 아니라 `holding`·`price` 도메인이
 * 아직 없어서다.** 두 이유는 다르고, 주문이 붙어도 이 값은 자동으로 안 고쳐진다 —
 * `portfolio`(보유 수량)와 `price`(현재가)가 둘 다 있어야 `Σ(수량 × 현재가)` 를 낼 수 있다.
 *
 * `asOf` 는 apiSpec 3.1 이 "시세 기준 시각" 으로 정의했다. 시세가 없는 동안은 응답을 만든 시각이고,
 * `price` 가 붙으면 **마지막 시세 수신 시각**으로 바뀐다. 그때 이 필드의 뜻이 달라지므로
 * 프론트가 "갱신 시각" 으로 표시하는 것은 지금도 맞다.
 */
data class AccountSummaryRes(
	val cashBalance: Long,
	val evaluationAmount: Long,
	val totalAsset: Long,
	val asOf: OffsetDateTime,
)
