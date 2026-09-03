package com.finch.global.security

import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.global.apiPayload.ErrorResponse
import com.finch.global.apiPayload.code.BaseErrorCode
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.nio.charset.StandardCharsets
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import tools.jackson.databind.ObjectMapper

/**
 * 인증이 필요한 경로에 사용자가 앉지 못한 채 도달했을 때 401 을 쓴다.
 *
 * 인증 실패 응답을 만드는 **유일한 지점**이다. [JwtAuthenticationFilter] 가 직접 쓰지 않고
 * 여기로 모은 이유는 그 클래스 주석에 있다. 응답 형식은 `GlobalExceptionHandler` 와 같은
 * [ErrorResponse] 를 쓴다 — 프론트가 401 을 두 가지 모양으로 파싱하지 않게 하려는 것이다 (apiSpec 1.3).
 *
 * 403 용 `AccessDeniedHandler` 는 두지 않았다. `AUTH_FORBIDDEN` 은 예약된 코드고
 * MVP 에는 그것을 내는 경로가 없다 — 역할 구분이 없고 CSRF 도 껐다 (apiSpec 1.2). 권한 개념이
 * 생기면 그때 같은 자리에 핸들러를 붙인다.
 */
class JwtAuthenticationEntryPoint(
	private val objectMapper: ObjectMapper,
) : AuthenticationEntryPoint {

	override fun commence(
		request: HttpServletRequest,
		response: HttpServletResponse,
		e: AuthenticationException,
	) {
		val errorCode = resolve(request)

		response.status = errorCode.status.value()
		response.contentType = MediaType.APPLICATION_JSON_VALUE
		// 에러 message 는 한글이고 사용자에게 그대로 노출된다 (apiSpec 1.3). 지정하지 않으면
		// 컨테이너 기본 인코딩(ISO-8859-1)으로 나가 프론트에서 깨진 문자로 보인다.
		response.characterEncoding = StandardCharsets.UTF_8.name()

		objectMapper.writeValue(response.writer, ErrorResponse.of(errorCode))
	}

	companion object {

		/**
		 * 필터가 적어 둔 사유가 있으면 그것이 정답이다 (만료 vs 무효).
		 *
		 * 없으면 `Authorization` 헤더 자체가 없던 요청이므로 `AUTH_INVALID_TOKEN` 이다.
		 * 누락을 `AUTH_TOKEN_EXPIRED` 로 주면 프론트가 재발급을 시도하고, 재발급이 성공하면
		 * **원래 토큰을 안 붙인 버그가 가려진다** (apiSpec 1.2).
		 */
		private fun resolve(request: HttpServletRequest): BaseErrorCode =
			JwtAuthenticationFilter.errorCodeOf(request) ?: AuthErrorCode.AUTH_INVALID_TOKEN
	}
}
