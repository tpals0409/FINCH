package com.finch.domain.ai.controller

import com.finch.domain.ai.service.AiRelayService
import com.finch.global.security.LoginUser
import org.springframework.http.HttpMethod
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import tools.jackson.databind.JsonNode

/**
 * AI 중계 API (apiSpec 10.1).
 *
 * 경로를 한 줄씩 적는다. `/api/v1/ai` 아래를 통째로 넘기는 catch-all 로 줄일 수 있지만,
 * 그러면 **중계 대상이 아닌 `POST /wiki/theses` 까지 열린다** — AI 서비스가 스스로 부르는 내부 경로다.
 * 목록이 명세와 1:1 이면 무엇이 열려 있는지 이 파일만 보고 안다.
 *
 * 본문·응답 타입이 `JsonNode` 인 이유는 `AiRelayService` 주석에 있다 (스키마를 모르는 제네릭 중계).
 */
@RestController
@RequestMapping("/api/v1/ai")
class AiController(
	private val relay: AiRelayService,
) {

	@PostMapping("/stocks/{stockCode}/analysis")
	fun analysis(
		@LoginUser userId: Long,
		@PathVariable stockCode: String,
		@RequestBody body: JsonNode,
	): JsonNode = relay.relay(
		HttpMethod.POST,
		"/stocks/{ticker}/analysis",
		userId,
		body = body,
		pathVariables = listOf(stockCode),
	)

	@PostMapping("/chat")
	fun chat(@LoginUser userId: Long, @RequestBody body: JsonNode): JsonNode =
		relay.relay(HttpMethod.POST, "/chat", userId, body = body)

	/** 본문이 없는 유일한 POST 다. 진단에 필요한 값은 AI 가 원장에서 직접 읽는다. */
	@PostMapping("/portfolio/diagnosis")
	fun diagnosis(@LoginUser userId: Long): JsonNode =
		relay.relay(HttpMethod.POST, "/portfolio/diagnosis", userId)

	@PostMapping("/portfolio/attribution")
	fun attribution(@LoginUser userId: Long, @RequestBody body: JsonNode): JsonNode =
		relay.relay(HttpMethod.POST, "/portfolio/attribution", userId, body = body)

	@PostMapping("/orders/preview")
	fun orderPreview(@LoginUser userId: Long, @RequestBody body: JsonNode): JsonNode =
		relay.relay(HttpMethod.POST, "/orders/preview", userId, body = body)

	@GetMapping("/briefing")
	fun briefing(@LoginUser userId: Long, @RequestParam(required = false) date: String?): JsonNode =
		relay.relay(HttpMethod.GET, "/briefing", userId, query = mapOf("date" to date))

	@PostMapping("/feedback")
	fun feedback(@LoginUser userId: Long, @RequestBody body: JsonNode): JsonNode =
		relay.relay(HttpMethod.POST, "/feedback", userId, body = body)

	@GetMapping("/wiki")
	fun wiki(@LoginUser userId: Long): JsonNode =
		relay.relay(HttpMethod.GET, "/wiki", userId)

	@PutMapping("/wiki/theses/{stockCode}")
	fun updateThesis(
		@LoginUser userId: Long,
		@PathVariable stockCode: String,
		@RequestBody body: JsonNode,
	): JsonNode = relay.relay(
		HttpMethod.PUT,
		"/wiki/theses/{ticker}",
		userId,
		body = body,
		pathVariables = listOf(stockCode),
	)

	@DeleteMapping("/wiki/facts/{factId}")
	fun deleteFact(@LoginUser userId: Long, @PathVariable factId: String): JsonNode =
		relay.relay(HttpMethod.DELETE, "/wiki/facts/{factId}", userId, pathVariables = listOf(factId))
}
