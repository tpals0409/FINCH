package com.finch.domain.watchlist.controller

import com.finch.domain.watchlist.dto.request.WatchlistCreateReq
import com.finch.domain.watchlist.service.WatchlistService
import com.finch.global.security.LoginUser
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * 관심 종목 API (apiSpec 6.3).
 *
 * ⚠️ **`GET /watchlist` 가 없다.** 응답에 시세가 필요한데 `price` 도메인이 아직 없다.
 * 이유는 `WatchlistService` 주석에 있다. 담기·빼기만 먼저 연다.
 */
@RestController
@RequestMapping("/api/v1/watchlist")
class WatchlistController(
	private val watchlistService: WatchlistService,
) {

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun add(@LoginUser userId: Long, @RequestBody request: WatchlistCreateReq) {
		watchlistService.add(userId, request.stockCode)
	}

	/** 없는 대상을 지워도 `204` 다 (apiSpec 11.2). */
	@DeleteMapping("/{stockCode}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun remove(@LoginUser userId: Long, @PathVariable stockCode: String) {
		watchlistService.remove(userId, stockCode)
	}
}
