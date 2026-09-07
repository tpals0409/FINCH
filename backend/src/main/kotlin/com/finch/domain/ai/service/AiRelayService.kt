package com.finch.domain.ai.service

import com.finch.domain.ai.exception.AiErrorCode
import com.finch.global.exception.AiRelayException
import com.finch.global.exception.CustomException
import java.io.InterruptedIOException
import java.time.Duration
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatusCode
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.ResourceAccessException
import org.springframework.web.client.RestClient
import tools.jackson.core.JacksonException
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

/**
 * AI 서버와 이야기하는 유일한 지점이다 (apiSpec 10장).
 *
 * 엔드포인트별 스키마를 모르는 **제네릭 중계**다 (10.3). 본문을 열어 보지 않고 키 표기만 바꾼다 —
 * 그래서 AI 가 `content` 안쪽을 바꿔도 백엔드를 고칠 일이 없다. DTO 를 11벌 만들면 AI 명세가
 * 움직일 때마다 두 저장소를 같이 배포해야 한다.
 *
 * 사용자 식별자는 **컨트롤러가 검증한 값으로 새로 쓴다.** 클라이언트가 보낸 헤더는 여기까지 오지 않는다
 * (aiApiSpec 4장 — AI 는 `X-User-Id` 를 검증 없이 신뢰하므로, 이 서비스가 그 신뢰의 근거다).
 */
@Service
class AiRelayService(
	@param:Value("\${finch.ai.base-url}") baseUrl: String,
	@param:Value("\${finch.ai.internal-token}") private val internalToken: String,
	@param:Value("\${finch.ai.timeout}") timeout: Duration,
	private val mapper: ObjectMapper,
) {

	private val client: RestClient = RestClient.builder()
		.baseUrl(baseUrl.trimEnd('/') + API_PREFIX)
		.requestFactory(
			SimpleClientHttpRequestFactory().apply {
				setConnectTimeout(CONNECT_TIMEOUT)
				setReadTimeout(timeout)
			},
		)
		.build()

	/**
	 * AI 서버를 부르고 응답을 백엔드 형식으로 재포장한다.
	 *
	 * @param path AI 서버 기준 경로. `/api/ai/v1` 아래의 부분만 준다
	 * @param userId 토큰에서 나온 값. 요청 본문·경로에서 온 값을 넘기지 않는다
	 */
	fun relay(
		method: HttpMethod,
		path: String,
		userId: Long,
		body: JsonNode? = null,
		query: Map<String, String?> = emptyMap(),
		pathVariables: List<String> = emptyList(),
	): JsonNode = repack(exchange(method, path, userId, body, query, pathVariables))

	private fun exchange(
		method: HttpMethod,
		path: String,
		userId: Long,
		body: JsonNode?,
		query: Map<String, String?>,
		pathVariables: List<String>,
	): JsonNode {
		var request: RestClient.RequestBodySpec = client.method(method)
			.uri { builder ->
				builder.path(path)
				for ((name, value) in query) {
					if (value != null) builder.queryParam(name, value)
				}
				// 경로 변수를 문자열로 이어 붙이지 않는다. 빌더에 넘겨야 값이 인코딩되고,
				// 값에 섞인 `{` 가 템플릿으로 해석되지 않는다.
				builder.build(*pathVariables.toTypedArray())
			}
			.header(INTERNAL_TOKEN_HEADER, internalToken)
			.header(TRUSTED_USER_HEADER, userId.toString())
			.accept(MediaType.APPLICATION_JSON)

		if (body != null) {
			request = request
				.contentType(MediaType.APPLICATION_JSON)
				.body(convertKeys(body, ::camelToSnake))
		}

		val response = try {
			// 기본 에러 처리를 끈다. 4xx·5xx 의 본문에 통과시켜야 할 code·requestId 가 들어 있다 (10.4).
			request.retrieve().onStatus({ true }) { _, _ -> }.toEntity(String::class.java)
		} catch (e: ResourceAccessException) {
			throw upstreamFailure(method, path, e)
		}

		if (response.statusCode.isError) {
			throw aiError(response.statusCode, response.body, method, path)
		}
		return parse(response.body) ?: run {
			log.warn("AI 성공 응답을 JSON 으로 읽지 못했다 method={} path={}", method, path)
			throw CustomException(AiErrorCode.AI_UPSTREAM_UNAVAILABLE)
		}
	}

	/**
	 * 봉투를 벗기고 보존 4종만 `content` 옆에 남긴다 (10.3).
	 *
	 * `content` 안쪽을 최상위로 펼치지 않는다 — 펼치면 엔드포인트마다 다른 키가 봉투 필드와
	 * 이름이 겹칠 수 있고, 그건 스키마를 모르는 중계가 감지할 수 없는 종류의 충돌이다.
	 */
	private fun repack(root: JsonNode): JsonNode {
		val camel = convertKeys(root, ::snakeToCamel)
		val out = mapper.createObjectNode()
		for (key in PRESERVED) {
			val value = camel[key] ?: continue
			out.set(key, value)
		}
		return out
	}

	/** AI 가 응답한 에러는 상태·코드·문구를 그대로 통과시킨다 (10.4). 모양이 다르면 우리 502 로 바꾼다. */
	private fun aiError(status: HttpStatusCode, rawBody: String?, method: HttpMethod, path: String): RuntimeException {
		val body = parse(rawBody)?.takeIf { it.isObject }
		val camel = body?.let { convertKeys(it, ::snakeToCamel) }
		val code = camel?.get("code")?.takeIf { it.isString }?.stringValue()
		val message = camel?.get("message")?.takeIf { it.isString }?.stringValue()

		if (code == null || message == null) {
			log.warn("AI 에러 응답이 명세 모양이 아니다 status={} method={} path={}", status, method, path)
			return CustomException(AiErrorCode.AI_UPSTREAM_UNAVAILABLE)
		}
		return AiRelayException(
			status = status,
			code = code,
			message = message,
			detail = camel["detail"],
			requestId = camel["requestId"]?.takeIf { it.isString }?.stringValue(),
		)
	}

	/**
	 * 연결 자체가 성립하지 않은 경우. 읽기 시간 초과만 504 로 가른다 —
	 * 프론트가 "다시 시도" 를 띄울지 말지가 이 구분에 달려 있다.
	 */
	private fun upstreamFailure(method: HttpMethod, path: String, e: ResourceAccessException): CustomException {
		// SocketTimeoutException 과 HttpTimeoutException 이 둘 다 InterruptedIOException 의 자식이다.
		val timedOut = generateSequence(e.cause) { it.cause }.any { it is InterruptedIOException }
		log.warn("AI 서버에 닿지 못했다 method={} path={} timeout={}", method, path, timedOut, e)
		return CustomException(
			if (timedOut) AiErrorCode.AI_UPSTREAM_TIMEOUT else AiErrorCode.AI_UPSTREAM_UNAVAILABLE,
		)
	}

	private fun parse(raw: String?): JsonNode? {
		if (raw.isNullOrBlank()) return null
		return try {
			mapper.readTree(raw)
		} catch (e: JacksonException) {
			null
		}
	}

	companion object {

		private val log = LoggerFactory.getLogger(AiRelayService::class.java)

		private const val INTERNAL_TOKEN_HEADER = "X-Internal-Token"

		private const val TRUSTED_USER_HEADER = "X-User-Id"

		/** aiApiSpec 1장의 `API_PREFIX`. 설정으로 빼지 않는다 — 틀리면 전부 404 가 되는 값이다. */
		private const val API_PREFIX = "/api/ai/v1"

		/** 클러스터 내부 호출이라 붙는 데 오래 걸릴 이유가 없다. 읽기 시간 초과와 구분해 빨리 끊는다. */
		private val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(3)

		/** 재포장 후에도 본문에 남기는 필드. 순서까지 apiSpec 10.3 예시를 따른다. */
		private val PRESERVED = listOf("content", "requestId", "dataAsOf", "citations", "disclaimer")

		internal fun snakeToCamel(key: String): String {
			val parts = key.split('_')
			if (parts.size == 1) return key
			return parts.first() + parts.drop(1).joinToString("") { it.replaceFirstChar(Char::uppercaseChar) }
		}

		private val CAMEL_BOUNDARY = Regex("([a-z0-9])([A-Z])")

		internal fun camelToSnake(key: String): String = key.replace(CAMEL_BOUNDARY, "$1_$2").lowercase()
	}

	/**
	 * 키 표기만 재귀로 바꾼다. **값은 건드리지 않는다** (10.3) — 종목코드·enum 문자열이 값 자리에 있고,
	 * 거기에 손대면 `005930` 이나 `MARKET_CLOSED` 가 조용히 다른 값이 된다.
	 */
	private fun convertKeys(node: JsonNode, rename: (String) -> String): JsonNode = when {
		node.isObject -> mapper.createObjectNode().also { out ->
			for ((key, value) in node.properties()) {
				out.set(rename(key), convertKeys(value, rename))
			}
		}

		node.isArray -> mapper.createArrayNode().also { out ->
			for (element in node) out.add(convertKeys(element, rename))
		}

		else -> node
	}
}
