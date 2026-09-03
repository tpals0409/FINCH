package com.finch.domain.deposit.dto.response

/**
 * `GET /api/v1/deposits/limit` 응답 본문 (apiSpec 4.1).
 *
 * **`depositedAmount` 는 초기 지급을 포함하지 않는다.** 이 값은 `type=DEPOSIT` 내역의 합계와
 * 같아야 하고, 그 필터는 원장 유형 `DEPOSIT` 만 담는다 (apiSpec 8.2). 초기 지급을 섞으면
 * "충전 내역을 다 더했는데 한도 화면의 숫자와 다르다" 가 된다.
 *
 * 누적 한도의 기준은 계정 전체다. v0.6 의 `roundCumulativeLimit`·`roundDepositedAmount` 가
 * 회차 제거와 함께 `cumulativeLimit`·`depositedAmount` 로 바뀌었다.
 */
data class DepositLimitRes(
	val perRequestLimit: Long,
	val cumulativeLimit: Long,
	val depositedAmount: Long,
	val remainingAmount: Long,
)
