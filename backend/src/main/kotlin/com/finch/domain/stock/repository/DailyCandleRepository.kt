package com.finch.domain.stock.repository

import com.finch.domain.stock.entity.DailyCandle
import com.finch.domain.stock.entity.DailyCandleId
import java.time.LocalDate
import org.springframework.data.repository.Repository

interface DailyCandleRepository : Repository<DailyCandle, DailyCandleId> {

	/**
	 * 기간 안의 일봉을 오래된 순으로. 차트는 왼쪽이 과거라 이 순서가 그대로 그려진다
	 * (apiSpec 5.3 의 `candles` 배열도 오름차순이다).
	 *
	 * PK 가 `(stock_code, trade_date)` 라 이 조회가 그 인덱스를 그대로 탄다.
	 */
	fun findByIdStockCodeAndIdTradeDateGreaterThanEqualOrderByIdTradeDateAsc(
		stockCode: String,
		from: LocalDate,
	): List<DailyCandle>

	fun save(candle: DailyCandle): DailyCandle
}
