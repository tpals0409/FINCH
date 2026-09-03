package com.finch.global.security

import com.finch.global.apiPayload.code.BaseErrorCode
import com.finch.global.exception.CustomException
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

/**
 * `Authorization: Bearer` 헤더를 읽어 SecurityContext 에 사용자를 앉힌다 (apiSpec 1.2).
 *
 * **이 필터는 요청을 거부하지 않는다.** 통과시키거나, 사용자를 앉히거나, 실패 사유를 요청에 적어 두고
 * 통과시키는 세 가지만 한다. 거부는 뒤의 `AuthorizationFilter` 가 경로 규칙을 보고 판단하고,
 * 응답 본문은 [JwtAuthenticationEntryPoint] 하나만 쓴다. 그렇게 나눈 이유가 두 개다.
 *
 * 1. **필터에서 던진 예외는 `GlobalExceptionHandler` 를 타지 않는다.** 그건
 *    `@RestControllerAdvice` 라 DispatcherServlet 안에서만 돌고 필터는 그 앞이다.
 *    그대로 던지면 401 자리에 500 이나 빈 응답이 나간다.
 * 2. 여기서 거부하면 **무인증 경로가 헤더 때문에 깨진다.** 프론트 인터셉터는 만료된 Access 를
 *    붙인 채로 `POST /auth/refresh` 를 부른다 (apiSpec 1.2). 그 엔드포인트의 판정 기준은
 *    쿠키뿐인데 검사대가 헤더를 보고 먼저 튕기면 재발급 자체가 불가능해진다.
 *
 * 그래서 화이트리스트 경로에 무효한 헤더가 실려 와도 아무 일도 일어나지 않는다 — 적어 둔 사유를
 * 읽는 것은 `authenticated()` 인 경로의 EntryPoint 뿐이다.
 *
 * 스프링 빈으로 등록하지 않고 `SecurityConfig` 가 직접 생성한다. `Filter` 타입 빈은
 * Boot 가 서블릿 필터 체인에도 자동 등록해서 요청마다 두 번 돌게 된다.
 */
class JwtAuthenticationFilter(
	private val jwtProvider: JwtProvider,
) : OncePerRequestFilter() {

	override fun doFilterInternal(
		request: HttpServletRequest,
		response: HttpServletResponse,
		chain: FilterChain,
	) {
		val header = request.getHeader(HttpHeaders.AUTHORIZATION)

		// 헤더가 아예 없는 것은 실패로 적지 않는다. 무인증 경로의 정상 요청이 대부분이고,
		// 인증 필요 경로라면 컨텍스트가 빈 것만으로 EntryPoint 가 AUTH_INVALID_TOKEN 을 낸다.
		if (header != null) {
			try {
				authenticate(jwtProvider.parseAccessToken(JwtProvider.resolveBearerToken(header)))
			} catch (e: CustomException) {
				// 만료(AUTH_TOKEN_EXPIRED)와 무효(AUTH_INVALID_TOKEN)를 가르는 판단은 JwtProvider 가
				// 이미 했다. 여기서 다시 해석하지 않고 그 코드를 그대로 옮긴다 — 두 곳에서 판정하면
				// 갈라진다. 프론트 인터셉터는 이 두 코드로만 재발급 여부를 가른다 (apiSpec 1.2).
				request.setAttribute(ERROR_CODE_ATTRIBUTE, e.errorCode)
			}
		}

		chain.doFilter(request, response)
	}

	companion object {

		/**
		 * 실패 사유를 EntryPoint 에게 넘기는 통로. 필터와 EntryPoint 사이에는 호출 관계가 없고
		 * (하나는 들어갈 때, 하나는 나올 때 돈다) 같은 요청 객체만 공유하므로 요청 속성을 쓴다.
		 *
		 * 이름에 클래스 FQCN 을 넣는 이유 — 서블릿 요청 속성은 프레임워크·서드파티가 함께 쓰는 전역
		 * 이름 공간이다. `"errorCode"` 같은 짧은 이름은 남의 값을 덮어쓸 수 있다.
		 */
		internal val ERROR_CODE_ATTRIBUTE: String = JwtAuthenticationFilter::class.java.name + ".errorCode"

		/**
		 * 빈 컨텍스트를 새로 만들어 갈아끼운다. `SecurityContextHolder.getContext()` 에 바로
		 * 쓰면 여러 요청이 공유할 수 있는 인스턴스를 건드리게 된다 (Spring Security 6 권장 방식).
		 *
		 * **비우는 일은 하지 않는다.** 컨텍스트는 ThreadLocal 이고 스레드는 풀에서 재사용되지만,
		 * 앞단의 `SecurityContextHolderFilter` 가 체인이 끝날 때 finally 로 지운다.
		 * STATELESS 라 세션에 저장되는 것도 없으므로 요청 하나가 끝나면 흔적이 남지 않는다.
		 */
		private fun authenticate(userId: Long) {
			val context = SecurityContextHolder.createEmptyContext()
			context.authentication = tokenFor(userId)
			SecurityContextHolder.setContext(context)
		}

		/**
		 * principal 에 `Long userId` 를 그대로 넣는다. `UserDetails` 를 만들지 않은 이유 —
		 * 그걸 채우려면 요청마다 `users` 를 한 번 더 읽어야 하는데, 우리에게 필요한 것은 식별자 하나이고
		 * 그 값은 이미 토큰 안에 서명된 채로 들어 있다. 권한도 비운다 — MVP 에 역할 구분이 없다 (apiSpec 1.2).
		 *
		 * 이 principal 을 컨트롤러가 직접 꺼내지는 않는다. `@LoginUser` 가 그 일을 대신해서
		 * 도메인 코드가 Spring Security 타입을 import 하지 않게 한다.
		 */
		private fun tokenFor(userId: Long): Authentication =
			UsernamePasswordAuthenticationToken(userId, null, emptyList())

		/** EntryPoint 가 사유를 읽는다. 필터가 적어 둔 것이 없으면 헤더 자체가 없던 요청이다. */
		internal fun errorCodeOf(request: HttpServletRequest): BaseErrorCode? =
			request.getAttribute(ERROR_CODE_ATTRIBUTE) as? BaseErrorCode
	}
}
