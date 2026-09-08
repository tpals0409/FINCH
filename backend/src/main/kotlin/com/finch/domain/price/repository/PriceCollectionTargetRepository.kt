package com.finch.domain.price.repository

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

/**
 * 화면에 실제로 쓰이는 핫셋 종목 코드를 순회용 문자열 프로젝션으로만 읽는다.
 *
 * backConvention 2.4 규칙 4의 조회 전용 프로젝션 예외다. holding·watchlist·recent·stock의
 * Entity·Repository를 import하지 않고 수집 대상 식별자만 읽는다. 별도 등록 테이블은 핫셋 변경과의
 * 동기화 실패 지점을 추가하므로 두지 않는다.
 */
@Repository
internal class PriceCollectionTargetRepository(private val jdbcClient: JdbcClient) {

	fun findAfter(afterStockCode: String, limit: Int): List<String> =
		jdbcClient.sql(
			"""
			WITH hot_stock AS (
			    SELECT stock_code FROM holding WHERE quantity > 0
			    UNION
			    SELECT stock_code FROM watchlist_item
			    UNION
			    SELECT stock_code FROM recent_viewed_stock
			)
			SELECT hot_stock.stock_code
			FROM hot_stock
			JOIN stock ON stock.stock_code = hot_stock.stock_code
			WHERE stock.is_active = true AND hot_stock.stock_code > :afterStockCode
			ORDER BY hot_stock.stock_code
			LIMIT :limit
			""".trimIndent(),
		)
			.param("afterStockCode", afterStockCode)
			.param("limit", limit)
			.query { resultSet, _ -> checkNotNull(resultSet.getString("stock_code")) }
			.list()

	fun countHotSet(): Long =
		jdbcClient.sql(
			"""
			WITH hot_stock AS (
			    SELECT stock_code FROM holding WHERE quantity > 0
			    UNION
			    SELECT stock_code FROM watchlist_item
			    UNION
			    SELECT stock_code FROM recent_viewed_stock
			)
			SELECT COUNT(*)
			FROM hot_stock
			JOIN stock ON stock.stock_code = hot_stock.stock_code
			WHERE stock.is_active = true
			""".trimIndent(),
		)
			.query(Long::class.java)
			.single()
}
