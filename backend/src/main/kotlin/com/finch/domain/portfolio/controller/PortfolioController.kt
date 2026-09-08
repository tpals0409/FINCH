package com.finch.domain.portfolio.controller

import com.finch.domain.portfolio.dto.PortfolioSort
import com.finch.domain.portfolio.dto.response.PortfolioRes
import com.finch.domain.portfolio.service.PortfolioService
import com.finch.global.security.LoginUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/portfolio")
class PortfolioController(
	private val portfolioService: PortfolioService,
) {
	@GetMapping
	fun getPortfolio(
		@LoginUser userId: Long,
		@RequestParam(defaultValue = "EVALUATION") sort: PortfolioSort,
	): PortfolioRes = portfolioService.getPortfolio(userId, sort)
}
