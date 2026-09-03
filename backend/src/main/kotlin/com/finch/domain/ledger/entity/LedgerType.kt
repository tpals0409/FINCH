package com.finch.domain.ledger.entity

/**
 * 원장 유형 4종. `ck_ledger_type` (V2) 과 같은 집합이다.
 *
 * 회차가 없어지면서 `ROUND_OPEN`·`ROUND_CLOSE` 가 사라졌다 (V2 머리말) — 회차 전환을 기록하던
 * delta 0 행이라 나눌 경계가 없으면 기록할 사건 자체가 없다.
 *
 * **`GET /transactions` 의 `type` 파라미터는 이 enum 이 아니다.** 그쪽은 화면 필터 축이라
 * `ALL` 이 있고 `INITIAL_GRANT` 가 없다 (apiSpec 8.2). 둘을 같은 타입으로 받으면
 * `?type=INITIAL_GRANT` 가 컴파일도 되고 응답도 나오는데 계약에는 없는 값이 된다.
 */
enum class LedgerType {

	/** 최초 로그인 1회, +1,000,000. 기록 주체는 `account` (backConvention 2.5). */
	INITIAL_GRANT,

	/** 모의 충전. 기록 주체는 `deposit`. */
	DEPOSIT,

	/** 매수 체결. 기록 주체는 `order`. */
	BUY,

	/** 매도 체결. 기록 주체는 `order`. */
	SELL,
}
