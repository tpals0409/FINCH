package com.finch.domain.account.dto

/**
 * 잠금을 쥔 채 읽은 계좌 스냅샷. `AccountService.lockForPosting` 이 돌려준다.
 *
 * **왜 필요한가** — 충전은 "누적 한도를 넘는지 검사" 와 "반영" 이 원자적이어야 하는데, 한도 정책은
 * `deposit` 의 것이고(1회 1천만·누적 1억은 충전 규칙이다) 잠금과 원장 짝맞춤은 `account` 의 것이다.
 * 그래서 account 가 잠금과 현재 값을 주고, deposit 이 자기 정책으로 판단한 뒤 account 에 반영을 맡긴다.
 *
 * 잠금은 트랜잭션 끝까지 유지되므로 이 스냅샷을 읽은 뒤 `post` 를 부르는 사이에
 * 다른 요청이 끼어들 수 없다. 두 번 부르지만 잠금은 한 번이다.
 */
data class AccountBalance(
	val cashBalance: Long,
	val totalDepositedAmount: Long,
)
