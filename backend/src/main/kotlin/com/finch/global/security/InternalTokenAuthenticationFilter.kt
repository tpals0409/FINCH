package com.finch.global.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import org.springframework.web.filter.OncePerRequestFilter

/** AI 전용 내부 API의 공유 토큰과 신뢰된 사용자 식별자를 검사한다. */
class InternalTokenAuthenticationFilter(
	private val expectedToken: String,
) : OncePerRequestFilter() {

	override fun shouldNotFilter(request: HttpServletRequest): Boolean =
		!request.requestURI.startsWith(INTERNAL_PREFIX)

	override fun doFilterInternal(
		request: HttpServletRequest,
		response: HttpServletResponse,
		chain: FilterChain,
	) {
		val actualToken = request.getHeader(INTERNAL_TOKEN_HEADER)
		val userId = request.getHeader(TRUSTED_USER_HEADER)?.trim()
		if (!tokenMatches(actualToken) || userId.isNullOrEmpty() || userId.toLongOrNull() == null) {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED)
			return
		}

		val context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext()
		context.authentication = org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
			userId.toLong(), null, emptyList(),
		)
		org.springframework.security.core.context.SecurityContextHolder.setContext(context)
		chain.doFilter(request, response)
	}

	private fun tokenMatches(actualToken: String?): Boolean {
		if (expectedToken.isEmpty() || actualToken == null) return false
		return MessageDigest.isEqual(
			expectedToken.toByteArray(StandardCharsets.UTF_8),
			actualToken.toByteArray(StandardCharsets.UTF_8),
		)
	}

	companion object {
		private const val INTERNAL_PREFIX = "/internal/v1/"
		private const val INTERNAL_TOKEN_HEADER = "X-Internal-Token"
		private const val TRUSTED_USER_HEADER = "X-User-Id"
	}
}
