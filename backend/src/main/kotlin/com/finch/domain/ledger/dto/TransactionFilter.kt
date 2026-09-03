package com.finch.domain.ledger.dto

/**
 * `GET /transactions` 의 `type` 파라미터 (apiSpec 8.2).
 *
 * **원장 유형이 아니라 화면 필터 축이다.** [LedgerType][com.finch.domain.ledger.entity.LedgerType] 과
 * 일부러 다른 타입으로 둔다 — 넷 중 `ALL` 은 원장 유형이 아니고, 원장 유형 `INITIAL_GRANT` 를
 * 가리키는 필터 값은 없다. 한 타입으로 합치면 `?type=INITIAL_GRANT` 가 컴파일도 되고 응답도 나오는데
 * 계약에는 없는 값이 된다.
 *
 * **`DEPOSIT` 은 원장 유형 `DEPOSIT`(충전)만이다. 초기 지급은 포함하지 않는다.** 이 필터의 합계가
 * `GET /deposits/limit` 의 `depositedAmount` 와 같아야 하기 때문이다. 둘이 어긋나면
 * "충전 내역을 다 더했는데 한도 화면의 숫자와 다르다" 가 된다.
 *
 * `INITIAL_GRANT` 1건은 `ALL` 에서 나온다 — 계정당 정확히 1건이고 가장 오래된 행이므로 목록의
 * 맨 끝(마지막 페이지)에 있다. 어느 필터에서도 볼 수 없는 행이 아니다.
 *
 * 화면의 필터 이름은 **"충전"** 이다. "입금" 으로 부르면 사용자가 초기 지급 1,000,000원도 그 안에
 * 있을 것으로 기대하는데 실제로는 없다 — 이름이 계약과 어긋나는 자리다 (featureSpec 8장).
 */
enum class TransactionFilter {
	ALL,
	BUY,
	SELL,
	DEPOSIT,
}
