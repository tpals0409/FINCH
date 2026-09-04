package com.finch.domain.watchlist.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.Table
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * `watchlist_item` 테이블 (V1). 사용자가 담아 둔 종목이다.
 *
 * 등록 이후 바뀔 값이 없어 갱신 메서드가 없다 — 담거나 빼거나 둘뿐이다.
 *
 * `user_id`·`stock_code` 를 연관으로 걸지 않았다. watchlist 는 4층이고 다른 도메인의 Entity 를
 * import 하지 않는다 (backConvention 2.4 규칙 3). FK 는 스키마가 갖는다.
 */
@Entity
@Table(name = "watchlist_item")
class WatchlistItem private constructor(
	userId: Long,
	stockCode: String,
) {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	final var id: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final var userId: Long = userId
		private set

	/** `Stock.stockCode` 와 같은 이유로 `@JdbcTypeCode(CHAR)` 다 — 스키마가 `CHAR(6)` 이다. */
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(nullable = false, updatable = false, length = 6)
	final var stockCode: String = stockCode
		private set

	/** 응답의 `registeredAt` (apiSpec 6.3). */
	@Column(nullable = false, updatable = false)
	final lateinit var createdAt: Instant
		private set

	@PrePersist
	private fun onCreate() {
		this.createdAt = Instant.now()
	}

	companion object {
		fun of(userId: Long, stockCode: String): WatchlistItem =
			WatchlistItem(userId, stockCode)
	}
}
