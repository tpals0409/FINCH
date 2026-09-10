package com.finch.domain.price.client

import java.net.URI
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.web.reactive.socket.WebSocketHandler
import org.springframework.web.reactive.socket.WebSocketMessage
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient
import reactor.core.Disposable
import reactor.core.publisher.Mono
import reactor.core.publisher.Sinks

internal interface KisWebSocketConnection {
	fun send(frame: String)
	fun close()
}

internal interface KisWebSocketTransport {
	fun connect(
		onConnected: (KisWebSocketConnection) -> Unit,
		onMessage: (String) -> Unit,
		onClosed: () -> Unit,
	): Disposable
}

@Component
@ConditionalOnProperty(prefix = "finch.price.kis.websocket", name = ["enabled"], havingValue = "true")
internal class ReactorKisWebSocketTransport(
	@param:Value("\${finch.price.kis.websocket.url}") private val url: String,
) : KisWebSocketTransport {

	init {
		require(url.isNotBlank()) { "KIS_WEBSOCKET_URL이 필요합니다" }
	}

	private val client = ReactorNettyWebSocketClient()

	override fun connect(
		onConnected: (KisWebSocketConnection) -> Unit,
		onMessage: (String) -> Unit,
		onClosed: () -> Unit,
	): Disposable {
		return client.execute(URI.create(url), WebSocketHandler { session ->
			val outbound = Sinks.many().unicast().onBackpressureBuffer<String>()
			val connection = object : KisWebSocketConnection {
				override fun send(frame: String) {
					outbound.tryEmitNext(frame)
				}

				override fun close() {
					outbound.tryEmitComplete()
				}
			}

			onConnected(connection)
			val receive = session.receive()
				.map(WebSocketMessage::getPayloadAsText)
				.doOnNext(onMessage)
				.then()
			val send = session.send(outbound.asFlux().map(session::textMessage))
			Mono.`when`(receive, send)
		}).doFinally { onClosed() }.subscribe()
	}
}
