package com.finch.domain.watchlist

import com.finch.domain.watchlist.dto.response.WatchlistRes
import com.finch.domain.watchlist.entity.WatchlistSort
import java.math.BigDecimal
import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * 정렬 세 갈래 (apiSpec 6.3). 스프링을 띄우지 않는다 — 순수 정렬이라 컨테이너를 기다릴 이유가 없다.
 */
class WatchlistSortTest {

	private val at = OffsetDateTime.parse("2026-09-06T09:00:00+09:00")

	private fun item(code: String, name: String, rate: String?) =
		WatchlistRes.Item(
			stockCode = code,
			stockName = name,
			currentPrice = rate?.let { 1_000 },
			changeAmount = rate?.let { 10 },
			changeRate = rate?.let(::BigDecimal),
			held = false,
			registeredAt = at,
		)

	/** 담은 순서의 역순은 리포지토리가 이미 만든다. 정렬은 그것을 건드리지 않아야 한다. */
	@Test
	@DisplayName("REGISTERED 는 받은 순서를 그대로 둔다")
	fun registeredKeepsOrder() {
		val given = listOf(item("000660", "SK하이닉스", "1.0"), item("005930", "삼성전자", "-1.0"))

		assertThat(WatchlistSort.REGISTERED.sort(given).map { it.stockCode })
			.containsExactly("000660", "005930")
	}

	@Test
	@DisplayName("NAME 은 종목명 오름차순이다")
	fun nameAscending() {
		val given = listOf(item("005930", "삼성전자", "1.0"), item("000660", "SK하이닉스", "1.0"))

		assertThat(WatchlistSort.NAME.sort(given).map { it.stockName })
			.containsExactly("SK하이닉스", "삼성전자")
	}

	@Test
	@DisplayName("CHANGE_RATE 는 내림차순이고 시세 없는 종목이 맨 뒤다")
	fun changeRateDescendingWithNullsLast() {
		val given = listOf(
			item("900140", "엘브이엠씨홀딩스", null),
			item("005930", "삼성전자", "-1.21"),
			item("247540", "에코프로비엠", "8.46"),
			item("068270", "셀트리온", "0.00"),
		)

		assertThat(WatchlistSort.CHANGE_RATE.sort(given).map { it.stockCode })
			.containsExactly("247540", "068270", "005930", "900140")
	}

	/**
	 * `null` 이 0 보다 뒤라는 것이 이 정렬의 핵심이다. 0 으로 보고 섞으면 하락한 종목보다
	 * 위에 서서 "안 떨어졌다" 로 읽힌다 — 값이 없는 것과 0% 인 것은 다르다.
	 */
	@Test
	@DisplayName("시세 없는 종목은 0% 종목보다도 뒤다")
	fun nullSortsBehindZero() {
		val given = listOf(item("900140", "없음", null), item("068270", "보합", "0.00"))

		assertThat(WatchlistSort.CHANGE_RATE.sort(given).map { it.stockCode })
			.containsExactly("068270", "900140")
	}
}
