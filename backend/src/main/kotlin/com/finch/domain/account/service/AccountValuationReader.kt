package com.finch.domain.account.service

import com.finch.domain.account.dto.AccountValuation

/**
 * account가 소유한 평가 조회 포트다. 구현은 holding을 소유한 portfolio가 제공한다.
 *
 * 낮은 계층인 account가 높은 계층의 서비스를 직접 참조하지 않으면서 계좌 요약을 완성하기 위한 경계다.
 */
interface AccountValuationReader {
	fun getValuation(accountId: Long): AccountValuation
}
