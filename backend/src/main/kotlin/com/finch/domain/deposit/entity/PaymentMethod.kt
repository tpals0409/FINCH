package com.finch.domain.deposit.entity

/**
 * 모의 결제 수단 (featureSpec 3.2). `ck_deposit_method` 와 같은 집합이다.
 *
 * **실제 금전 이동은 없다.** 실제 결제와 유사한 절차를 밟게 하려고 두는 시뮬레이션용 선택지이고,
 * 어느 값을 골라도 처리 경로가 같다.
 */
enum class PaymentMethod {
	VIRTUAL_CARD,
	VIRTUAL_TRANSFER,
}
