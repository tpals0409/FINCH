package com.finch.domain.price.service

import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

internal class KisRequestPacerTest {

	@Test
	fun `연속 요청 시작 시각 사이에 부족한 50ms를 기다린다`() {
		var now = 0L
		val waits = mutableListOf<Long>()
		val pacer = KisRequestPacer(
			nanoTime = { now },
			sleepNanos = {
				waits += it
				now += it
			},
		)

		assertThat(pacer.awaitPermit()).isTrue()
		now += Duration.ofMillis(10).toNanos()
		assertThat(pacer.awaitPermit()).isTrue()

		assertThat(waits).containsExactly(Duration.ofMillis(40).toNanos())
	}
}
