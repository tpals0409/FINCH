package com.finch.domain.stock.repository

import java.sql.Timestamp
import java.time.Instant
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository

/** 종목 마스터의 전일 종가를 원자적인 한 SQL로 갱신하는 쓰기 전용 저장소다. */
@Repository
internal class PreviousCloseRepository(
	private val jdbcTemplate: NamedParameterJdbcTemplate,
) {

	fun updateAll(items: List<PreviousCloseUpdate>, updatedAt: Instant): Int {
		if (items.isEmpty()) return 0

		val params = MapSqlParameterSource().addValue("updatedAt", Timestamp.from(updatedAt))
		val values = items.mapIndexed { index, item ->
			params.addValue("stockCode$index", item.stockCode)
			params.addValue("close$index", item.close)
			"(:stockCode$index, :close$index)"
		}.joinToString(",")

		return jdbcTemplate.update(
			"""
			UPDATE stock s
			SET previous_close = v.close_price,
			    updated_at = :updatedAt
			FROM (VALUES $values) AS v(stock_code, close_price)
			WHERE s.stock_code = CAST(v.stock_code AS CHAR(6))
			  AND s.previous_close IS DISTINCT FROM v.close_price
			""".trimIndent(),
			params,
		)
	}
}

internal data class PreviousCloseUpdate(
	val stockCode: String,
	val close: Long,
)
