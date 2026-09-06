package com.finch.domain.watchlist.service

import com.finch.domain.stock.service.StockService
import com.finch.domain.watchlist.dto.response.WatchlistRes
import com.finch.domain.watchlist.entity.WatchlistItem
import com.finch.domain.watchlist.entity.WatchlistSort
import com.finch.domain.watchlist.exception.WatchlistErrorCode
import com.finch.domain.watchlist.repository.WatchlistItemRepository
import com.finch.global.exception.CustomException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 관심 종목 (apiSpec 6.3). watchlist 는 4층이고 `stock`(1층)을 참조한다.
 *
 * 시세는 `price` 를 거쳐 얻는다. 수신 이력이 없으면 세 값이 `null` 이고, 그건 고장이 아니라
 * apiSpec 5.4 의 "값 없음" 이다 — **담아 둔 종목은 시세와 무관하게 목록에 남는다.**
 */
@Service
class WatchlistService(
	private val watchlistItemRepository: WatchlistItemRepository,
	private val stockService: StockService,
) {

	/**
	 * 목록 (apiSpec 6.3).
	 *
	 * 종목이 사라지면 그 줄을 뺀다(`mapNotNull`). 종목 마스터는 고정 적재라 실제로는 안 생기지만,
	 * 생겼을 때 목록 전체를 500 으로 만들 이유가 없다 — 나머지 49개는 멀쩡하다.
	 *
	 * `count` 는 응답에 실린 줄 수다. 한도 판정은 서버가 `countByUserId` 로 따로 하므로,
	 * 빠진 줄이 있어도 사용자가 볼 숫자와 화면에 그려진 줄 수는 어긋나지 않는다.
	 */
	@Transactional(readOnly = true)
	fun list(userId: Long, sort: WatchlistSort): WatchlistRes {
		val entries = watchlistItemRepository.findByUserIdOrderByCreatedAtDesc(userId)
		val summaries = stockService.getSummaries(entries.map { it.stockCode })

		val items = entries.mapNotNull { entry ->
			summaries[entry.stockCode]?.let { WatchlistRes.item(it, entry.createdAt) }
		}

		return WatchlistRes(
			count = items.size,
			maxCount = MAX_COUNT.toInt(),
			items = sort.sort(items),
		)
	}

	/**
	 * 담는다.
	 *
	 * **한도 검사와 INSERT 사이는 원자적이지 않다.** 같은 사용자가 50번째와 51번째를 동시에
	 * 보내면 둘 다 통과할 수 있다. 계좌 잔액과 달리 여기는 잠금을 걸지 않았다 — 최악이 51개가
	 * 되는 것이고 되돌릴 수 없는 손실이 아니다. 돈이 움직이는 경로가 아니라서 잠금 비용을
	 * 치르지 않는 쪽을 골랐다.
	 *
	 * 중복은 다르다. `uq_watchlist_user_stock` 이 DB 에서 막고 그 예외를 코드로 옮긴다 —
	 * 조회 후 INSERT 는 두 요청이 모두 "없음" 을 볼 수 있다.
	 */
	@Transactional
	fun add(userId: Long, stockCode: String) {
		// 없는 종목이면 STOCK_NOT_FOUND 다. FK 위반을 500 으로 흘리지 않는다.
		stockService.getOrThrow(stockCode)

		if (watchlistItemRepository.countByUserId(userId) >= MAX_COUNT) {
			throw CustomException(WatchlistErrorCode.WATCHLIST_LIMIT_EXCEEDED)
		}

		try {
			watchlistItemRepository.save(WatchlistItem.of(userId, stockCode))
		} catch (e: DataIntegrityViolationException) {
			throw CustomException(WatchlistErrorCode.WATCHLIST_ALREADY_EXISTS)
		}
	}

	/**
	 * 뺀다. **없는 대상을 빼도 성공이다** (apiSpec 11.2 의 멱등 규칙).
	 *
	 * 남의 것을 지목한 경우도 구분 없이 성공이다 — 존재 여부 자체가 정보 노출이라 알려주지
	 * 않는다 (이슈 #23). `userId` 조건이 그것을 자동으로 만든다.
	 */
	@Transactional
	fun remove(userId: Long, stockCode: String) {
		watchlistItemRepository.deleteByUserIdAndStockCode(userId, stockCode)
	}

	/**
	 * 종목 상세의 `watched` (apiSpec 5.2).
	 *
	 * `stock` 이 이 값을 직접 읽지 않고 `StockController` 가 받아 넘긴다. `watchlist` 가 이미
	 * `StockService` 를 쓰므로, `stock` 이 여기를 참조하면 생성자 주입이 서로를 기다리다
	 * 기동에 실패한다.
	 */
	@Transactional(readOnly = true)
	fun isWatched(userId: Long, stockCode: String): Boolean =
		watchlistItemRepository.existsByUserIdAndStockCode(userId, stockCode)

	companion object {
		/** apiSpec 6.3. 최대 50개. */
		const val MAX_COUNT = 50L
	}
}
