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
	 * 목록 조회 (apiSpec 6.3). **최근에 담은 것이 위다.**
	 *
	 * 정렬을 SQL 로 끝내지 않는 이유는 `NAME`·`CHANGE_RATE` 가 이 테이블에 없는 값을 기준으로
	 * 삼기 때문이다 — 이름은 `stock`, 등락률은 Redis 시세 캐시에 있다. 세 정렬을 한 경로로
	 * 두려고 여기서는 등록순만 내고 나머지는 서비스가 메모리에서 정렬한다. 최대 50건이라
	 * 그 비용이 문제되지 않는다.
	 */
	fun findByUserIdOrderByCreatedAtDesc(userId: Long): List<WatchlistItem>

	/**
	 * 없는 대상을 지워도 조용히 0을 돌려준다. 삭제는 멱등이어야 해서
	 * "지울 게 없었다" 와 "지웠다" 를 응답에서 가르지 않는다 (apiSpec 11.2).
	 */
	fun deleteByUserIdAndStockCode(userId: Long, stockCode: String): Long
}
