package com.finch.domain.auth.service

import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.global.exception.CustomException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.ClientResponse
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono

/**
 * 카카오 서버를 부르지 않고 응답만 흉내낸다. 진짜 카카오는 인가 코드가 한 번만 쓰이는 데다
 * 콘솔 설정에 의존해서 자동 테스트로 반복할 수 없다.
 */
class KakaoOAuthClientTest {

	@Test
	@DisplayName("인가 코드로 카카오 회원번호·닉네임·프로필을 받아 온다")
	fun fetchesUser() {
		val client = clientOf { request -> json(HttpStatus.OK, if (isTokenCall(request)) TOKEN_JSON else USER_JSON) }

		val user = client.fetchUser("code", REDIRECT_URI)

		assertThat(user.kakaoId).isEqualTo(1234567890L)
		assertThat(user.nickname).isEqualTo("홍길동")
		assertThat(user.profileImageUrl).isEqualTo("https://img.kakao/1.jpg")
	}

	@Test
	@DisplayName("프로필 사진에 동의하지 않았으면 null 이다 — 빈 문자열로 바꾸지 않는다")
	fun profileImageIsNullWhenNotConsented() {
		val noImage = """
			{"id":1234567890,"kakao_account":{"profile":{"nickname":"홍길동"}}}"""
		val client = clientOf { request -> json(HttpStatus.OK, if (isTokenCall(request)) TOKEN_JSON else noImage) }

		val user = client.fetchUser("code", REDIRECT_URI)

		assertThat(user.profileImageUrl).isNull()
		assertThat(user.nickname).isEqualTo("홍길동")
	}

	@Test
	@DisplayName("카카오가 오류를 주면 AUTH_KAKAO_FAILED 하나로 모은다 — 사유를 밖으로 알리지 않는다")
	fun kakaoErrorBecomesSingleCode() {
		val error = """
			{"error":"invalid_grant","error_description":"authorization code not found"}"""
		val client = clientOf { json(HttpStatus.UNAUTHORIZED, error) }

		assertThatThrownBy { client.fetchUser("used-code", REDIRECT_URI) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_KAKAO_FAILED)
	}

	@Test
	@DisplayName("토큰 응답에 access_token 이 없으면 사용자 조회로 넘어가지 않는다")
	fun missingAccessTokenFails() {
		val client = clientOf {
			json(
				HttpStatus.OK, """
			{"token_type":"bearer"}"""
			)
		}

		assertThatThrownBy { client.fetchUser("code", REDIRECT_URI) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_KAKAO_FAILED)
	}

	@Test
	@DisplayName("닉네임이 없으면 이름 없는 계정을 만들지 않고 실패한다 — 동의항목이 우리 가정과 다른 경우다")
	fun missingNicknameFails() {
		val client = clientOf { request ->
			json(
				HttpStatus.OK, if (isTokenCall(request)) TOKEN_JSON else """
			{"id":1234567890}"""
			)
		}

		assertThatThrownBy { client.fetchUser("code", REDIRECT_URI) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_KAKAO_FAILED)
	}

	@Test
	@DisplayName("Client Secret 을 켠 앱이면 토큰 교환에 client_secret 을 싣는다")
	fun includesClientSecretWhenPresent() {
		val client = KakaoOAuthClient(WebClient.create(), "rest-api-key", "client-secret")

		assertThat(client.tokenForm("code", REDIRECT_URI))
			.containsEntry("client_secret", listOf("client-secret"))
			.containsEntry("grant_type", listOf("authorization_code"))
			.containsEntry("client_id", listOf("rest-api-key"))
			.containsEntry("redirect_uri", listOf(REDIRECT_URI))
			.containsEntry("code", listOf("code"))
	}

	@Test
	@DisplayName("Client Secret 을 켜지 않은 앱이면 client_secret 을 아예 빼고 보낸다")
	fun omitsClientSecretWhenBlank() {
		val client = KakaoOAuthClient(WebClient.create(), "rest-api-key", "")

		// 빈 문자열을 실어 보내면 카카오가 불일치로 거절할 수 있다. 키가 없어야 한다.
		assertThat(client.tokenForm("code", REDIRECT_URI)).doesNotContainKey("client_secret")
	}

	/** 토큰 교환은 kauth, 사용자 조회는 kapi 로 간다. 한 함수로 두 호출을 구분한다. */
	private fun isTokenCall(request: ClientRequest): Boolean = request.url().toString().contains("kauth")

	private fun clientOf(responder: (ClientRequest) -> ClientResponse): KakaoOAuthClient {
		val webClient = WebClient.builder()
			.exchangeFunction { request -> Mono.just(responder(request)) }
			.build()
		return KakaoOAuthClient(webClient, "rest-api-key", "client-secret")
	}

	private fun json(status: HttpStatus, body: String): ClientResponse =
		ClientResponse.create(status)
			.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
			.body(body)
			.build()

	companion object {

		private val TOKEN_JSON = """
			{"access_token":"kakao-access-token","token_type":"bearer","expires_in":21599}"""

		private val USER_JSON = """
			{"id":1234567890,"kakao_account":{"profile":{"nickname":"홍길동",
			"profile_image_url":"https://img.kakao/1.jpg"}}}"""

		private const val REDIRECT_URI = "http://localhost:5173/oauth/kakao"
	}
}
