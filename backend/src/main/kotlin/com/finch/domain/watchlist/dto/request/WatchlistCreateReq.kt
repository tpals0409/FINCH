package com.finch.domain.watchlist.dto.request

/**
 * `POST /api/v1/watchlist` 요청 본문 (apiSpec 6.3).
 *
 * **종목코드는 6자리 문자열이다.** 숫자로 받으면 `005930` 의 앞 `0` 이 사라진다 (루트 CLAUDE.md).
 */
data class WatchlistCreateReq(
	val stockCode: String,
)
