package com.finch.domain.watchlist.entity

import com.finch.domain.watchlist.dto.response.WatchlistRes

/**
 * 관심 종목 정렬 (apiSpec 6.3).
 *
 * 정렬을 SQL 이 아니라 여기서 하는 이유는 `NAME`·`CHANGE_RATE` 의 기준 값이 `watchlist_item`
 * 테이블에 없어서다 — 이름은 `stock`, 등락률은 시세 캐시에 있다. 최대 50건이라 비용이 없다.
 */
enum class WatchlistSort {
	/** 담은 순서의 역순. 최근에 담은 것이 위다. 리포지토리가 이미 이 순서로 준다. */
	REGISTERED {
		override fun sort(items: List<WatchlistRes.Item>) = items
	},

	NAME {
		override fun sort(items: List<WatchlistRes.Item>) = items.sortedBy { it.stockName }
	},

	/**
	 * 등락률 내림차순. **시세 없는 종목은 뒤로 보낸다.**
	 *
	 * `null` 을 0 으로 보고 섞으면 하락한 종목보다 위에 서서 "안 떨어졌다" 로 읽힌다.
	 * 값이 없는 것과 0% 인 것은 다르다.
	 */
	CHANGE_RATE {
		override fun sort(items: List<WatchlistRes.Item>) =
			items.sortedWith(
				compareByDescending<WatchlistRes.Item> { it.changeRate != null }
					.thenByDescending { it.changeRate },
			)
	},
	;

	abstract fun sort(items: List<WatchlistRes.Item>): List<WatchlistRes.Item>
}
