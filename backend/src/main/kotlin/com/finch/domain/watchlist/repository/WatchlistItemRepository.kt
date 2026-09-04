package com.finch.domain.watchlist.repository

import com.finch.domain.watchlist.entity.WatchlistItem
import org.springframework.data.repository.Repository

interface WatchlistItemRepository : Repository<WatchlistItem, Long> {

	fun save(item: WatchlistItem): WatchlistItem

	/** 종목 상세의 `watched` (apiSpec 5.2). 목록을 다 읽지 않고 존재만 본다. */
	fun existsByUserIdAndStockCode(userId: Long, stockCode: String): Boolean

	/** 50개 한도 판정용 (apiSpec 6.3). */
	fun countByUserId(userId: Long): Long

	/**
	 * 없는 대상을 지워도 조용히 0을 돌려준다. 삭제는 멱등이어야 해서
	 * "지울 게 없었다" 와 "지웠다" 를 응답에서 가르지 않는다 (apiSpec 11.2).
	 */
	fun deleteByUserIdAndStockCode(userId: Long, stockCode: String): Long
}
