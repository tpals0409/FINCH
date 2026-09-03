package com.finch.domain.auth.controller

import com.finch.domain.auth.dto.request.KakaoLoginReq
import com.finch.domain.auth.dto.response.AuthUserRes
import com.finch.domain.auth.dto.response.KakaoLoginRes
import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.domain.auth.service.AuthService
import com.finch.domain.auth.service.LoginResult
import com.finch.domain.auth.service.TokenPair
import com.finch.global.config.SecurityConfig
import com.finch.global.exception.CustomException
import com.finch.global.security.JwtProvider
import jakarta.servlet.http.Cookie
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers
import org.mockito.BDDMockito.given
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * apiSpec 2.1 의 응답 계약을 고정한다. 필드 이름 하나가 달라지면 프론트의 Zod 파싱이 깨지므로
 * 값이 아니라 **이름과 위치**를 보는 테스트다.
 */
@WebMvcTest(AuthController::class)
@Import(SecurityConfig::class)
class AuthControllerTest {

	@Autowired
	private lateinit var mockMvc: MockMvc

	@MockitoBean
	private lateinit var authService: AuthService

	@MockitoBean
	private lateinit var jwtProvider: JwtProvider

	@Test
	@DisplayName("로그인 응답 본문은 accessToken · isNewUser · user 세 개다")
	fun returnsContractedBody() {
		given(authService.loginWithKakao(anyOf(KakaoLoginReq::class.java)))
			.willReturn(loginResult("https://img.kakao/1.jpg"))

		mockMvc.perform(post("/api/v1/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(REQUEST_JSON))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.accessToken").value("access-token"))
			// isNewUser 는 boolean 이라 Jackson 이 "newUser" 로 깎을 수 있다. 이름을 그대로 못 박는다.
			.andExpect(jsonPath("$.isNewUser").value(true))
			.andExpect(jsonPath("$.user.userId").value(1))
			.andExpect(jsonPath("$.user.nickname").value("홍길동"))
			.andExpect(jsonPath("$.user.profileImageUrl").value("https://img.kakao/1.jpg"))
	}

	@Test
	@DisplayName("Refresh Token 은 본문에 없고 Set-Cookie 로만 나간다")
	fun sendsRefreshTokenOnlyAsCookie() {
		given(authService.loginWithKakao(anyOf(KakaoLoginReq::class.java))).willReturn(loginResult(null))

		val result = mockMvc.perform(
			post("/api/v1/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(REQUEST_JSON)
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.refreshToken").doesNotExist())
			.andReturn()

		val cookie = result.response.getHeader(HttpHeaders.SET_COOKIE)
		assertThat(cookie).contains("refreshToken=refresh-token")
			.contains("HttpOnly")
			.contains("Secure")
			.contains("SameSite=Lax")
			.contains("Path=/api/v1/auth")
			// 14일. apiSpec 2.1 의 Max-Age=1209600 과 같은 값이어야 한다.
			.contains("Max-Age=1209600")
	}

	@Test
	@DisplayName("프로필 사진이 없으면 본문에 null 로 나간다 — 필드를 빼지 않는다")
	fun keepsNullProfileImageField() {
		given(authService.loginWithKakao(anyOf(KakaoLoginReq::class.java))).willReturn(loginResult(null))

		mockMvc.perform(post("/api/v1/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(REQUEST_JSON))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.user.profileImageUrl").isEmpty)
	}

	@Test
	@DisplayName("인가 코드가 비어 있으면 서비스를 부르지 않고 400 이다")
	fun rejectsBlankAuthorizationCode() {
		val blank = """
			{"authorizationCode":"","redirectUri":"http://localhost:5173/oauth/kakao"}"""

		mockMvc.perform(post("/api/v1/auth/kakao").contentType(MediaType.APPLICATION_JSON).content(blank))
			.andExpect(status().isBadRequest)
	}

	@Test
	@DisplayName("재발급은 본문에 accessToken 만 주고 새 Refresh 는 쿠키로 내려간다")
	fun refreshReturnsAccessTokenAndRotatesCookie() {
		given(authService.refresh("old-refresh")).willReturn(TokenPair("new-access", "new-refresh"))

		val result = mockMvc.perform(post("/api/v1/auth/refresh").cookie(Cookie("refreshToken", "old-refresh")))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.accessToken").value("new-access"))
			.andExpect(jsonPath("$.refreshToken").doesNotExist())
			.andReturn()

		assertThat(result.response.getHeader(HttpHeaders.SET_COOKIE))
			.contains("refreshToken=new-refresh")
			.contains("Max-Age=1209600")
	}

	@Test
	@DisplayName("쿠키가 없으면 AUTH_REFRESH_TOKEN_MISSING — 최초 방문자를 로그인 화면으로 튕기지 않으려는 구분이다")
	fun missingCookieIsItsOwnCode() {
		mockMvc.perform(post("/api/v1/auth/refresh"))
			.andExpect(status().isUnauthorized)
			.andExpect(jsonPath("$.code").value("AUTH_REFRESH_TOKEN_MISSING"))

		// 쿠키 유무는 HTTP 의 일이라 서비스까지 내려가지 않는다.
		verifyNoInteractions(authService)
	}

	/**
	 * 이 테스트가 백5 의 필터 설계를 못 박는다. 프론트 인터셉터는 **만료된 Access 를 붙인 채로**
	 * 재발급을 부른다 (apiSpec 1.2). 필터가 헤더를 보고 직접 401 을 쓰면 재발급 자체가 불가능해져
	 * 세션 복구가 영구히 깨진다 — 그래서 필터는 거부하지 않고 EntryPoint 가 인증 필요 경로에서만 판단한다.
	 */
	@Test
	@DisplayName("만료된 Access 가 실려 와도 재발급은 막히지 않는다 — 판정 기준은 쿠키뿐이다")
	fun refreshIgnoresTheAuthorizationHeader() {
		given(jwtProvider.parseAccessToken("expired"))
			.willThrow(CustomException(AuthErrorCode.AUTH_TOKEN_EXPIRED))
		given(authService.refresh("old-refresh")).willReturn(TokenPair("new-access", "new-refresh"))

		mockMvc.perform(
			post("/api/v1/auth/refresh")
				.header(HttpHeaders.AUTHORIZATION, "Bearer expired")
				.cookie(Cookie("refreshToken", "old-refresh"))
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.accessToken").value("new-access"))
	}

	@Test
	@DisplayName("로그아웃은 204 이고 브라우저 쿠키도 즉시 만료시킨다")
	fun logoutClearsCookie() {
		given(jwtProvider.parseAccessToken("access-token")).willReturn(7L)

		val result =
			mockMvc.perform(post("/api/v1/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
				.andExpect(status().isNoContent)
				.andReturn()

		verify(authService).logout(7L)
		assertThat(result.response.getHeader(HttpHeaders.SET_COOKIE))
			.contains("refreshToken=")
			.contains("Max-Age=0")
	}

	@Test
	@DisplayName("Authorization 헤더가 없으면 로그아웃도 AUTH_INVALID_TOKEN — 화이트리스트 밖이라 필터 체인에서 걸린다")
	fun logoutWithoutBearerIsInvalidToken() {
		mockMvc.perform(post("/api/v1/auth/logout"))
			.andExpect(status().isUnauthorized)
			.andExpect(jsonPath("$.code").value("AUTH_INVALID_TOKEN"))

		verifyNoInteractions(authService)
	}

	private fun loginResult(profileImageUrl: String?): LoginResult =
		LoginResult(
			KakaoLoginRes("access-token", true, AuthUserRes(1L, "홍길동", profileImageUrl)),
			"refresh-token",
		)

	companion object {

		private val REQUEST_JSON = """
			{"authorizationCode":"code","redirectUri":"http://localhost:5173/oauth/kakao"}"""

		/**
		 * Mockito 의 any(...) 는 null 을 돌려주는데, Kotlin 은 non-null 파라미터 자리에 플랫폼 값이 오면
		 * 호출부에 null 검사를 끼워 넣어 그 자리에서 터진다. 제네릭으로 한 겹 감싸면 검사가 생기지 않는다.
		 */
		private fun <T> anyOf(type: Class<T>): T = ArgumentMatchers.any(type)
	}
}
