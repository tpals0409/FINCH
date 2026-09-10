package com.finch.domain.price.client

import java.time.OffsetDateTime
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class KisWebSocketMessageDecoderTest {

	private val receivedAt = OffsetDateTime.parse("2026-09-10T11:30:00+09:00")
	private val decoder = KisWebSocketMessageDecoder { receivedAt }

	@Test
	fun `H0STCNT0 체결 프레임에서 종목코드와 현재가를 읽는다`() {
		val message = decoder.decodePrice("0|H0STCNT0|1|005930^113000^73500^2^900^1.21")

		assertThat(message?.stockCode).isEqualTo("005930")
		assertThat(message?.tick?.currentPrice).isEqualTo(73_500)
		assertThat(message?.tick?.asOf).isEqualTo(receivedAt)
	}

	@Test
	fun `한 프레임의 여러 체결 레코드를 모두 읽는다`() {
		val messages = decoder.decodePrices(
			"0|H0STCNT0|2|005930^113000^73500^2^900^1.21^000660^113001^185000^1^800^0.54",
		)

		assertThat(messages).hasSize(2)
		assertThat(messages[0].stockCode).isEqualTo("005930")
		assertThat(messages[0].tick.currentPrice).isEqualTo(73_500)
		assertThat(messages[1].stockCode).isEqualTo("000660")
		assertThat(messages[1].tick.currentPrice).isEqualTo(185_000)
	}

	@Test
	fun `다른 거래 유형과 잘못된 가격은 폐기한다`() {
		assertThat(decoder.decodePrice("0|H0STASP0|1|005930^113000^73500")).isNull()
		assertThat(decoder.decodePrice("0|H0STCNT0|1|005930^113000^0")).isNull()
		assertThat(decoder.decodePrice("0|H0STCNT0|1|5930^113000^73500")).isNull()
	}

	@Test
	fun `구독 성공 응답은 종목코드와 성공 여부를 반환한다`() {
		val ack = decoder.decodeSubscriptionAck(
			"""{"header":{"tr_id":"H0STCNT0","tr_key":"005930"},"body":{"rt_cd":"0"}}""",
		)

		assertThat(ack).isEqualTo(KisSubscriptionAck("005930", true))
	}

	@Test
	fun `구독 실패 응답은 성공하지 않은 것으로 반환한다`() {
		val ack = decoder.decodeSubscriptionAck(
			"""{"header":{"tr_id":"H0STCNT0","tr_key":"005930"},"body":{"rt_cd":"1"}}""",
		)

		assertThat(ack).isEqualTo(KisSubscriptionAck("005930", false))
	}
}
