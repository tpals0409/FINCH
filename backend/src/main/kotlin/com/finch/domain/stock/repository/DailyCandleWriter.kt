package com.finch.domain.stock.repository

import com.finch.domain.stock.client.CandleHistoryItem
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository

/** 한 종목의 일봉을 한 SQL로 멱등 적재한다. */
@Repository
internal class DailyCandleWriter(private val jdbcTemplate: NamedParameterJdbcTemplate) {
	fun upsert(stockCode: String, candles: List<CandleHistoryItem>): Int {
		if (candles.isEmpty()) return 0

		val params = MapSqlParameterSource().addValue("stockCode", stockCode)
		val values = candles.mapIndexed { index, candle ->
			params
				.addValue("date$index", candle.date)
				.addValue("open$index", candle.open)
				.addValue("high$index", candle.high)
				.addValue("low$index", candle.low)
				.addValue("close$index", candle.close)
				.addValue("volume$index", candle.volume)
			"(:date$index, :open$index, :high$index, :low$index, :close$index, :volume$index)"
		}.joinToString(",")

		return jdbcTemplate.update(
			"""
			INSERT INTO daily_candle
			    (stock_code, trade_date, open_price, high_price, low_price, close_price, volume)
			SELECT CAST(:stockCode AS CHAR(6)), v.trade_date, v.open_price, v.high_price,
			       v.low_price, v.close_price, v.volume
			FROM (VALUES $values)
			    AS v(trade_date, open_price, high_price, low_price, close_price, volume)
			ON CONFLICT (stock_code, trade_date) DO UPDATE
			SET open_price = EXCLUDED.open_price,
			    high_price = EXCLUDED.high_price,
			    low_price = EXCLUDED.low_price,
			    close_price = EXCLUDED.close_price,
			    volume = EXCLUDED.volume
			WHERE (daily_candle.open_price, daily_candle.high_price, daily_candle.low_price,
			       daily_candle.close_price, daily_candle.volume)
			      IS DISTINCT FROM
			      (EXCLUDED.open_price, EXCLUDED.high_price, EXCLUDED.low_price,
			       EXCLUDED.close_price, EXCLUDED.volume)
			""".trimIndent(),
			params,
		)
	}
}
