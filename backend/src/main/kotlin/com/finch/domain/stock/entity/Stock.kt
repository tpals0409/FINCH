package com.finch.domain.stock.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * `stock` 테이블 (V1). 종목 마스터이고 `V5__seed_stock_master.sql` 이 2,598행을 적재한다.
 *
 * **마스터는 프로젝트 기간 중 고정이다** (apiSpec 5.1 · 이슈 #19). 그래서 상장폐지 종목이
 * 검색 중에 생기는 상황을 다루지 않고, 보유 종목이 폐지되는 경우도 MVP 범위 밖이다.
 *
 * `id` 를 따로 두지 않고 `stock_code` 가 PK 다 — 종목코드가 이미 전역 고유 식별자다.
 */
@Entity
@Table(name = "stock")
class Stock protected constructor() {

	/**
	 * **6자리 문자열이다. 숫자로 다루면 `005930` 의 앞 `0` 이 사라진다** (루트 CLAUDE.md).
	 *
	 * `@JdbcTypeCode(CHAR)` 가 필요한 이유는 `IdempotencyRecord.requestHash` 와 같다 —
	 * 스키마가 `CHAR(6)` 인데 Hibernate 는 `String` 을 `varchar` 로 매핑하고
	 * `ddl-auto: validate` 가 **JDBC 타입 코드**를 비교해 막는다. `columnDefinition` 만으로는
	 * 통과하지 못한다.
	 */
	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "stock_code", nullable = false, length = 6)
	final lateinit var stockCode: String
		private set

	@Column(nullable = false, length = 100)
	final lateinit var stockName: String
		private set

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	final lateinit var market: Market
		private set

	/** `true` 면 화면에 뱃지를 노출하고 매수를 막는다 (apiSpec 5.1). */
	@Column(nullable = false)
	final var suspended: Boolean = false
		private set

	@Column(length = 200)
	final var suspendedReason: String? = null
		private set

	/**
	 * 등락 계산 기준 (erd.md 2.7 이 "의도적 중복" 이라고 명시한 컬럼).
	 *
	 * `daily_candle` 에서 유도할 수 있지만 매 요청 쓰이므로 일 1회 배치로 캐시한다.
	 * 지금은 시드가 32종만 채웠고 나머지는 `null` 이다 — KIS 수집이 붙으면 전종목으로 찬다.
	 * `null` 인 종목은 등락률을 낼 수 없다.
	 */
	@Column
	final var previousClose: Long? = null
		private set

	/** 상장폐지 시 `false`. **검색 결과에서 제외한다** (apiSpec 5.1). */
	@Column(nullable = false)
	final var isActive: Boolean = true
		private set

	@Column(nullable = false)
	final lateinit var updatedAt: Instant
		private set
}
