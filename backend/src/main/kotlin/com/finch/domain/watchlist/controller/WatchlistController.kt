package com.finch.domain.watchlist.controller

import com.finch.domain.watchlist.dto.request.WatchlistCreateReq
import com.finch.domain.watchlist.dto.response.WatchlistRes
import com.finch.domain.watchlist.entity.WatchlistSort
import com.finch.domain.watchlist.service.WatchlistService
import com.finch.global.security.LoginUser
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * 관심 종목 API (apiSpec 6.3).
 *
 * 관심 종목은 **독립 화면을 갖지 않는다.** 홈 안의 영역으로만 존재한다 (ia.md §1) —
 * API 는 그대로 살아 있고 홈이 부른다.
 */
@RestController
@RequestMapping("/api/v1/watchlist")
class WatchlistController(
	private val watchlistService: WatchlistService,
) {

	/** `sort` 를 안 주면 등록순(최근 담은 것이 위)이다. 값이 enum 밖이면 400 이다. */
	@GetMapping
	fun list(
		@LoginUser userId: Long,
		@RequestParam(defaultValue = "REGISTERED") sort: WatchlistSort,
	): WatchlistRes = watchlistService.list(userId, sort)

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
