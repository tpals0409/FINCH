package com.finch.domain.portfolio.repository

import com.finch.domain.portfolio.entity.Holding
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

interface HoldingRepository : Repository<Holding, Long> {

	fun save(holding: Holding): Holding

	/**
	 * 체결 직전에 잠그고 읽는다.
	 *
	 * **잠금이 없으면 같은 종목을 동시에 매도할 때 둘 다 "수량 충분" 을 보고 통과한다.**
	 * 계좌 잔액과 같은 이유로 비관적 잠금을 건다 — 되돌릴 수 없는 손실이 나는 자리다.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select h from Holding h where h.accountId = :accountId and h.stockCode = :stockCode")
	fun lockByAccountIdAndStockCode(
		@Param("accountId") accountId: Long,
		@Param("stockCode") stockCode: String,
	): Holding?

	/** 보유 목록. 수량 0 인 잔존 행은 호출자가 거른다 (apiSpec 8.1). */
	fun findByAccountId(accountId: Long): List<Holding>

	/** 표시용 단건 조회. **잠그지 않는다** — 화면이 여는 조회가 행을 잠그면 안 된다. */
	fun findByAccountIdAndStockCode(accountId: Long, stockCode: String): Holding?

	/** 보유 목록과 평가에 필요한 종목 마스터를 한 번에 읽는 DTO 프로젝션이다. */
	@Query(
		value = """
			SELECT h.stock_code AS "stockCode",
			       s.stock_name AS "stockName",
			       h.quantity AS quantity,
			       h.avg_buy_price AS "avgBuyPrice",
			       s.previous_close AS "previousClose"
			FROM holding h
			JOIN stock s ON s.stock_code = h.stock_code
			WHERE h.account_id = :accountId AND h.quantity > 0
		""",
		nativeQuery = true,
	)
	fun findPositionsByAccountId(@Param("accountId") accountId: Long): List<HoldingPositionRow>

	/** 종목 상세 보유 카드도 목록과 같은 DTO 프로젝션으로 읽어 종목명을 코드로 대신하지 않는다. */
	@Query(
		value = """
			SELECT h.stock_code AS "stockCode",
			       s.stock_name AS "stockName",
			       h.quantity AS quantity,
			       h.avg_buy_price AS "avgBuyPrice",
			       s.previous_close AS "previousClose"
			FROM holding h
			JOIN stock s ON s.stock_code = h.stock_code
			WHERE h.account_id = :accountId
			  AND h.stock_code = :stockCode
			  AND h.quantity > 0
		""",
		nativeQuery = true,
	)
	fun findPositionByAccountIdAndStockCode(
		@Param("accountId") accountId: Long,
		@Param("stockCode") stockCode: String,
	): HoldingPositionRow?
}
