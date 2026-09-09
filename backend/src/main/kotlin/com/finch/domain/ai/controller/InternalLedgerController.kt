package com.finch.domain.ai.controller

import com.finch.domain.ai.dto.InternalPortfolioRes
import com.finch.domain.ai.dto.InternalTradesRes
import com.finch.domain.ai.service.InternalLedgerService
import com.finch.global.security.LoginUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/internal/v1")
class InternalLedgerController(
	private val service: InternalLedgerService,
) {
	@GetMapping("/portfolio")
	fun portfolio(@LoginUser userId: Long): InternalPortfolioRes = service.getPortfolio(userId)

	@GetMapping("/trades")
	fun trades(
		@LoginUser userId: Long,
		@RequestParam(required = false) cursor: String?,
		@RequestParam(required = false) size: Int?,
	): InternalTradesRes = service.getTrades(userId, cursor, size)
}
