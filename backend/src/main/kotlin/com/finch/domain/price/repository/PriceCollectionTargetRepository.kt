package com.finch.domain.price.repository

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Repository

/**
 * 활성 종목 코드를 순회용 문자열 프로젝션으로만 읽는다.
 *
 * backConvention 2.4 규칙 4의 조회 전용 프로젝션 예외다. stock Entity·Repository를 import하지 않고
 * 수집 대상 식별자만 읽는다. 가격 계산에 필요한 previous_close까지 가져오는 것은 이 예외의 범위가 아니다.
 */
@Repository
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class PriceCollectionTargetRepository(private val jdbcClient: JdbcClient) {

	fun findAfter(afterStockCode: String, limit: Int): List<String> =
		jdbcClient.sql(
			"""
			SELECT stock_code
			FROM stock
			WHERE is_active = true AND stock_code > :afterStockCode
			ORDER BY stock_code
			LIMIT :limit
			""".trimIndent(),
		)
			.param("afterStockCode", afterStockCode)
			.param("limit", limit)
			.query { resultSet, _ -> checkNotNull(resultSet.getString("stock_code")) }
			.list()
}
