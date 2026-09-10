package com.finch.domain.recent.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/** `recent_viewed_stock` 한 행. 같은 사용자·종목은 하나만 두고 viewedAt만 갱신한다. */
@Entity
@Table(name = "recent_viewed_stock")
class RecentViewedStock private constructor(
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

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(nullable = false, updatable = false, length = 6)
	final var stockCode: String = stockCode
		private set

	@Column(nullable = false)
	final var viewedAt: Instant = Instant.now()
		private set

	companion object {
		fun of(userId: Long, stockCode: String): RecentViewedStock = RecentViewedStock(userId, stockCode)
	}
}
