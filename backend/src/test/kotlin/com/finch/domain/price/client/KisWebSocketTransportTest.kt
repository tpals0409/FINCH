package com.finch.domain.price.client

import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

internal class KisWebSocketTransportTest {

	@Test
	fun `활성화된 웹소켓의 URL 누락은 생성 시점에 실패한다`() {
		assertThatThrownBy { ReactorKisWebSocketTransport("") }
			.isInstanceOf(IllegalArgumentException::class.java)
			.hasMessage("KIS_WEBSOCKET_URL이 필요합니다")
	}
}
