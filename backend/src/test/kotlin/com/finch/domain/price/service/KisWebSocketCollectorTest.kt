package com.finch.domain.price.service

import com.finch.domain.price.client.KisApprovalKeyClient
import com.finch.domain.price.client.KisWebSocketConnection
import com.finch.domain.price.client.KisWebSocketTransport
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.verify
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
import reactor.core.Disposable
import tools.jackson.databind.ObjectMapper

@ExtendWith(MockitoExtension::class, OutputCaptureExtension::class)
internal class KisWebSocketCollectorTest {

	@Mock
	private lateinit var approvalKeyClient: KisApprovalKeyClient

	@Mock
	private lateinit var targetRepository: PriceCollectionTargetRepository

	@Mock
	private lateinit var cacheWriter: PriceCacheWriter

	@Mock
	private lateinit var coverage: KisStreamCoverage

	@Mock
	private lateinit var lease: PriceCollectorLease

	private class FakeTransport : KisWebSocketTransport {
		lateinit var connected: (KisWebSocketConnection) -> Unit
		lateinit var received: (String) -> Unit

		override fun connect(
			onConnected: (KisWebSocketConnection) -> Unit,
			onMessage: (String) -> Unit,
			onClosed: () -> Unit,
		): Disposable {
			connected = onConnected
			received = onMessage
			return Disposable { onClosed() }
		}
	}

	@Test
	fun `구독 성공 종목은 REST 폴백 커버리지에서 빠지고 틱은 기존 캐시에 쓴다`(output: CapturedOutput) {
		val transport = FakeTransport()
		val frames = mutableListOf<String>()
		val connection = object : KisWebSocketConnection {
			override fun send(frame: String) {
				frames += frame
			}

			override fun close() = Unit
		}
		given(lease.acquireOrRenew()).willReturn(true)
		given(targetRepository.findAllHotSet()).willReturn(listOf("005930"))
		given(approvalKeyClient.issue()).willReturn("approval-secret")

		val collector = KisWebSocketCollector(
			approvalKeyClient,
			transport,
			targetRepository,
			cacheWriter,
			coverage,
			lease,
			ObjectMapper(),
			"H0STCNT0",
		)

		collector.reconcile()
		transport.connected.invoke(connection)

		assertThat(frames.single()).contains("approval-secret", "H0STCNT0", "005930")
		transport.received.invoke("""{"header":{"tr_id":"H0STCNT0","tr_key":"005930"},"body":{"rt_cd":"0"}}""")
		transport.received.invoke("0|H0STCNT0|1|005930^113000^73500^2")

		verify(coverage).replace(setOf("005930"))
		assertThat(frames.joinToString()).doesNotContain("app-secret")
		assertThat(output).doesNotContain("approval-secret", "app-secret", "005930^113000^73500^2")
	}
}
