package com.finch.domain.stock.entity

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.io.Serializable
import java.time.LocalDate
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/** 복합 키 `(stock_code, trade_date)`. 같은 종목의 같은 날 캔들은 하나뿐이다. */
@Embeddable
data class DailyCandleId(
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "stock_code", nullable = false, length = 6)
	val stockCode: String,

	@Column(name = "trade_date", nullable = false)
	val tradeDate: LocalDate,
) : Serializable

/**
 * `daily_candle` 테이블 (V1). 일봉이다.
 *
 * **분봉은 확장 범위이고 도입 여부가 `[S0-4]` 다** (apiSpec 5.3). 이 테이블에 interval 컬럼을
 * 두지 않은 것이 그 결정이다 — 분봉이 들어오면 테이블을 나눈다.
 *
 * `stock` 과 달리 시드 마이그레이션이 없다. 마스터는 "고정 적재" 하는 레퍼런스 데이터지만
 * 캔들은 수집으로 계속 쌓이는 값이라, 표본 32종을 마이그레이션에 넣으면 그 표본이 운영까지
 * 따라간다. 테스트는 자기 픽스처를 넣고, 운영은 KIS 수집이 채운다.
 */
@Entity
@Table(name = "daily_candle")
class DailyCandle protected constructor() {

	@EmbeddedId
	final lateinit var id: DailyCandleId
		private set

	@Column(name = "open_price", nullable = false)
	final var open: Long = 0
		private set

	@Column(name = "high_price", nullable = false)
	final var high: Long = 0
		private set

	@Column(name = "low_price", nullable = false)
	final var low: Long = 0
		private set

	@Column(name = "close_price", nullable = false)
	final var close: Long = 0
		private set

	@Column(nullable = false)
	final var volume: Long = 0
		private set
}
