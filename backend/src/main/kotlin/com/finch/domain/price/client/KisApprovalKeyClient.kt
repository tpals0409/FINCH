package com.finch.domain.price.client

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.reactive.function.client.WebClient
import tools.jackson.databind.ObjectMapper
import com.fasterxml.jackson.annotation.JsonProperty

/** KIS 웹소켓 전용 approval_key를 발급한다. REST access token과 분리한다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis.websocket", name = ["enabled"], havingValue = "true")
internal class KisApprovalKeyClient internal constructor(
	private val webClient: WebClient,
	private val objectMapper: ObjectMapper,
	private val appKey: String,
	private val appSecret: String,
) {

	@Autowired
	constructor(
		objectMapper: ObjectMapper,
		@Value("\${KIS_BASE_URL}") baseUrl: String,
		@Value("\${KIS_APP_KEY}") appKey: String,
		@Value("\${KIS_APP_SECRET}") appSecret: String,
	) : this(WebClient.builder().baseUrl(baseUrl).build(), objectMapper, appKey, appSecret)

	fun issue(): String {
		val raw = webClient.post()
			.uri(APPROVAL_PATH)
			.contentType(MediaType.APPLICATION_JSON)
			.bodyValue(
				mapOf(
					"grant_type" to "client_credentials",
					"appkey" to appKey,
					"secretkey" to appSecret,
				),
			)
			.retrieve()
			.bodyToMono(String::class.java)
			.block()
			?: throw IllegalStateException("KIS approval_key 응답이 비어 있습니다")

		val approvalKey = runCatching {
			objectMapper.readValue(raw, ApprovalResponse::class.java).approvalKey
		}.getOrNull()?.takeIf(String::isNotBlank)
		return approvalKey ?: throw IllegalStateException("KIS approval_key 응답이 유효하지 않습니다")
	}

	private data class ApprovalResponse(
		@param:JsonProperty("approval_key") val approvalKey: String?,
	)

	companion object {
		private const val APPROVAL_PATH = "/oauth2/Approval"
	}
}
