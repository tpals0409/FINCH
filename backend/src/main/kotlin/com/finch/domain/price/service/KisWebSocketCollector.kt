package com.finch.domain.price.service

import com.finch.domain.price.client.KisApprovalKeyClient
import com.finch.domain.price.client.KisPriceMessage
import com.finch.domain.price.client.KisSubscriptionAck
import com.finch.domain.price.client.KisWebSocketConnection
import com.finch.domain.price.client.KisWebSocketMessageDecoder
import com.finch.domain.price.client.KisWebSocketTransport
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ThreadLocalRandom
import java.util.concurrent.atomic.AtomicBoolean
import org.springframework.beans.factory.annotation.Autowired
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper

/** KIS 웹소켓을 유지하고, 성공적으로 등록된 종목만 REST 폴백에서 제외한다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis.websocket", name = ["enabled"], havingValue = "true")
internal class KisWebSocketCollector(
	private val approvalKeyClient: KisApprovalKeyClient,
	private val transport: KisWebSocketTransport,
	private val targetRepository: PriceCollectionTargetRepository,
	private val cacheWriter: PriceCacheWriter,
	private val streamCoverage: KisStreamCoverage,
	private val lease: PriceCollectorLease,
	private val objectMapper: ObjectMapper,
	@param:Value("\${finch.price.kis.websocket.tr-id:H0STCNT0}") private val trId: String,
	private val clock: Clock = Clock.systemUTC(),
) {

	@Autowired
	constructor(
		approvalKeyClient: KisApprovalKeyClient,
		transport: KisWebSocketTransport,
		targetRepository: PriceCollectionTargetRepository,
		cacheWriter: PriceCacheWriter,
		streamCoverage: KisStreamCoverage,
		lease: PriceCollectorLease,
		objectMapper: ObjectMapper,
		@Value("\${finch.price.kis.websocket.tr-id:H0STCNT0}") trId: String,
	) : this(
		approvalKeyClient,
		transport,
		targetRepository,
		cacheWriter,
		streamCoverage,
		lease,
		objectMapper,
		trId,
		Clock.systemUTC(),
	)

	private val decoder = KisWebSocketMessageDecoder { OffsetDateTime.now(clock) }
	private val connecting = AtomicBoolean()
	private val subscribed = ConcurrentHashMap.newKeySet<String>()
	private val pending = ConcurrentHashMap<String, PendingSubscription>()
	@Volatile private var connection: KisWebSocketConnection? = null
	@Volatile private var currentApprovalKey = ""
	@Volatile private var retryAt = Instant.MIN
	@Volatile private var connectingSince = Instant.MIN
	@Volatile private var connectionAttempt: reactor.core.Disposable? = null
	private var reconnectAttempt = 0

	@Scheduled(fixedDelayString = "\${finch.price.kis.websocket.reconcile-interval:3s}")
	fun reconcile() {
		if (!lease.acquireOrRenew()) {
			connection?.close()
			return
		}
		val desired = targetRepository.findAllHotSet().toSet()
		if (connecting.get() && !clock.instant().isBefore(connectingSince.plus(HANDSHAKE_TIMEOUT))) {
			connectionAttempt?.dispose()
			connectionAttempt = null
			connecting.set(false)
			scheduleRetry()
			log.warn("KIS 웹소켓 핸드셰이크 타임아웃")
			return
		}
		if (connection == null) {
			if (clock.instant().isBefore(retryAt)) return
			connect()
			return
		}
		synchronize(desired)
	}

	private fun connect() {
		if (!connecting.compareAndSet(false, true)) return
		connectingSince = clock.instant()
		try {
			val approvalKey = approvalKeyClient.issue()
			currentApprovalKey = approvalKey
			connectionAttempt = transport.connect(
				onConnected = { connected ->
					connectionAttempt = null
					connection = connected
					connecting.set(false)
					subscribed.clear()
					pending.clear()
					streamCoverage.clear()
					reconnectAttempt = 0
					retryAt = Instant.MIN
					synchronize(targetRepository.findAllHotSet().toSet())
				},
				onMessage = ::handleMessage,
				onClosed = {
					connectionAttempt = null
					connection = null
					connecting.set(false)
					subscribed.clear()
					pending.clear()
					currentApprovalKey = ""
					streamCoverage.clear()
					scheduleRetry()
				},
			)
		} catch (exception: RuntimeException) {
			connecting.set(false)
			currentApprovalKey = ""
			scheduleRetry()
			log.warn("KIS 웹소켓 연결 실패 stage=connect exceptionType={}", exception::class.simpleName)
		}
	}

	private fun scheduleRetry() {
		val seconds = 1L shl reconnectAttempt.coerceAtMost(5)
		val jitterMillis = ThreadLocalRandom.current().nextLong(0, 250)
		retryAt = clock.instant().plus(Duration.ofSeconds(seconds)).plusMillis(jitterMillis)
		reconnectAttempt = (reconnectAttempt + 1).coerceAtMost(6)
	}

	private fun synchronize(desired: Set<String>) {
		val active = connection ?: return
		val now = clock.instant()
		pending.filterValues { now.isAfter(it.sentAt.plus(PENDING_TIMEOUT)) }.keys.forEach { pending.remove(it) }
		(desired - subscribed - pending.keys).forEach { send(active, it, SubscriptionType.SUBSCRIBE) }
		(subscribed - desired - pending.keys).forEach { send(active, it, SubscriptionType.UNSUBSCRIBE) }
	}

	private fun send(connection: KisWebSocketConnection, stockCode: String, type: SubscriptionType) {
		pending[stockCode] = PendingSubscription(type, clock.instant())
		try {
			connection.send(frame(stockCode, type))
		} catch (exception: RuntimeException) {
			pending.remove(stockCode)
			log.warn("KIS 웹소켓 구독 프레임 전송 실패 stockCode={} type={} exceptionType={}", stockCode, type, exception::class.simpleName)
		}
	}

	private fun handleMessage(raw: String) {
		decoder.decodeSubscriptionAck(raw)?.let(::handleAck)
			?: decoder.decodePrices(raw).forEach(::handlePrice)
	}

	private fun handleAck(ack: KisSubscriptionAck) {
		val type = pending.remove(ack.stockCode)?.type ?: return
		if (ack.success && type == SubscriptionType.SUBSCRIBE) subscribed.add(ack.stockCode)
		if (ack.success && type == SubscriptionType.UNSUBSCRIBE) subscribed.remove(ack.stockCode)
		streamCoverage.replace(subscribed.toSet())
		if (!ack.success) {
			log.warn("KIS 웹소켓 구독 실패 stockCode={} type={}", ack.stockCode, type)
		}
	}

	private fun handlePrice(message: KisPriceMessage) {
		if (message.stockCode in subscribed) cacheWriter.write(message.stockCode, message.tick)
	}

	private fun frame(stockCode: String, type: SubscriptionType): String = objectMapper.writeValueAsString(
		mapOf(
			"header" to mapOf(
				"approval_key" to currentApprovalKey,
				"custtype" to "P",
				"tr_type" to type.wireValue,
				"content-type" to "utf-8",
			),
			"body" to mapOf("input" to mapOf("tr_id" to trId, "tr_key" to stockCode)),
		),
	)

	private enum class SubscriptionType(val wireValue: String) {
		SUBSCRIBE("1"),
		UNSUBSCRIBE("2"),
	}

	private data class PendingSubscription(val type: SubscriptionType, val sentAt: Instant)

	companion object {
		private val HANDSHAKE_TIMEOUT = Duration.ofSeconds(10)
		private val PENDING_TIMEOUT = Duration.ofSeconds(10)
		private val log = LoggerFactory.getLogger(KisWebSocketCollector::class.java)
	}
}
