package com.finch.domain.price

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.price.service.PriceTick
import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

/**
 * 등락 유도와 apiSpec 5.4 의 `stale` 세 갈래를 지킨다.
 *
 * 스프링을 띄우지 않는다 — 검증 대상이 순수 계산이라 컨테이너를 기다릴 이유가 없다.
 */
class PriceResTest {

	private val asOf = OffsetDateTime.parse("2026-08-20T14:30:00+09:00")

	@Test
	@DisplayName("전일 종가로 등락을 유도한다 — apiSpec 5.4 예시와 같은 값이 나온다")
	fun derivesChange() {
		val res = PriceRes.of("005930", PriceTick(73_500, asOf), previousClose = 74_400, stale = false)

		assertThat(res.currentPrice).isEqualTo(73_500)
		assertThat(res.changeAmount).isEqualTo(-900)
		// -900 / 74400 * 100 = -1.20967... → 둘째 자리 반올림
		assertThat(res.changeRate).isEqualByComparingTo("-1.21")
		assertThat(res.stale).isFalse()
	}

	@Test
	@DisplayName("반올림은 둘째 자리 HALF_UP 이다 — Double 이면 값이 흔들리는 자리")
	fun roundsHalfUp() {
		val res = PriceRes.of("000660", PriceTick(30_005, asOf), previousClose = 30_000, stale = false)

		// 5 / 30000 * 100 = 0.016666... → 0.02
		assertThat(res.changeRate).isEqualByComparingTo("0.02")
	}

	@Test
	@DisplayName("전일 종가가 없거나 0 이면 등락만 null 이고 현재가는 그대로 내려간다")
	fun keepsPriceWithoutBase() {
		listOf(null, 0L).forEach { base ->
			val res = PriceRes.of("035720", PriceTick(50_000, asOf), previousClose = base, stale = false)

			assertThat(res.currentPrice).isEqualTo(50_000)
			assertThat(res.changeAmount).isNull()
			assertThat(res.changeRate).isNull()
		}
	}

	@Test
	@DisplayName("수신이 끊겨도 마지막 값을 유지하고 stale 로만 알린다 — apiSpec 5.4 표 가운데 줄")
	fun keepsLastValueWhenStale() {
		val res = PriceRes.of("005930", PriceTick(73_500, asOf), previousClose = 74_400, stale = true)

		assertThat(res.currentPrice).isEqualTo(73_500)
		assertThat(res.asOf).isEqualTo(asOf)
		assertThat(res.stale).isTrue()
	}

	@Test
	@DisplayName("수신 이력이 없으면 전부 null 이고 stale 이다 — apiSpec 5.4 표 마지막 줄")
	fun emptyWhenNeverReceived() {
		val res = PriceRes.empty("005930")

		assertThat(res.currentPrice).isNull()
		assertThat(res.changeAmount).isNull()
		assertThat(res.changeRate).isNull()
		assertThat(res.asOf).isNull()
		assertThat(res.stale).isTrue()
	}
}
