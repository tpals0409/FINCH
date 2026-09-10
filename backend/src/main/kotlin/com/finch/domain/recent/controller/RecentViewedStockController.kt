package com.finch.domain.recent.controller

import com.finch.domain.recent.dto.response.RecentViewedRes
import com.finch.domain.recent.service.RecentViewedStockService
import com.finch.global.security.LoginUser
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/stocks/recent")
class RecentViewedStockController(
	private val service: RecentViewedStockService,
) {

	@GetMapping
	fun list(@LoginUser userId: Long): RecentViewedRes = service.list(userId)

	@DeleteMapping("/{stockCode}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun remove(@LoginUser userId: Long, @PathVariable stockCode: String) {
		service.remove(userId, stockCode)
	}

	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun removeAll(@LoginUser userId: Long) {
		service.removeAll(userId)
	}
}
