package com.finch.domain.account.controller

import com.finch.domain.account.dto.response.AccountSummaryRes
import com.finch.domain.account.service.AccountService
import com.finch.global.security.LoginUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 계좌 API (apiSpec 3장).
 *
 * **경로에 계좌 식별자가 없다** (apiSpec 1.6). 계좌는 사용자당 하나라 클라이언트가 지목할 대상이
 * 아니고, 받으면 남의 숫자를 적어 넣는 것만으로 남의 계좌가 열린다.
 *
 * `POST /account/reset`(계좌 리셋)과 `GET /rounds`(회차 목록)는 v0.7 에서 삭제됐다 (이슈 #27).
 */
@RestController
@RequestMapping("/api/v1/account")
class AccountController(
	private val accountService: AccountService,
) {

	@GetMapping
	fun summary(@LoginUser userId: Long): AccountSummaryRes = accountService.getSummary(userId)
}
