package com.finch.domain.auth.service

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.global.exception.CustomException
import java.time.Duration
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.util.MultiValueMap
import org.springframework.web.reactive.function.BodyInserters
import org.springframework.web.reactive.function.client.WebClient

/**
 * 카카오와 이야기하는 유일한 지점이다. 인가 코드를 사용자 정보로 바꿔 주고, 그 외는 아무것도 모른다.
 *
 * Spring Security OAuth2 Client 를 쓰지 않는다 (backConvention 1장). 프론트가 인가 코드를 받아
 * 우리 API 로 넘기는 구조라 서버에는 리다이렉트 로그인 플로우가 없다. 그래서 WebClient 로 직접 부른다.
 *
 * 실패는 종류를 가리지 않고 `AUTH_KAKAO_FAILED` 하나로 모은다 (apiSpec 11장).
 * 코드가 만료됐는지 이미 썼는지 시크릿이 틀렸는지를 응답으로 알려주면 공격자에게 힌트가 된다.
 */
@Component
class KakaoOAuthClient internal constructor(
	private val webClient: WebClient,
	private val clientId: String,
	private val clientSecret: String,
) {

	@Autowired
	constructor(
		@Value("\${kakao.client-id}") clientId: String,
		@Value("\${kakao.client-secret}") clientSecret: String,
		// WebClient.Builder 를 주입받지 않는다. 이 앱은 서블릿(webmvc)이라 그 빈이 자동 구성되지 않는다.
	) : this(WebClient.create(), clientId, clientSecret)

	/** 인가 코드 → (카카오 토큰) → 사용자 정보. 카카오 토큰은 이 메서드 밖으로 나가지 않는다. */
	fun fetchUser(authorizationCode: String, redirectUri: String): KakaoUser =
		fetchUserInfo(exchangeToken(authorizationCode, redirectUri))

	/**
	 * 인가 코드를 카카오 Access Token 으로 바꾼다.
	 *
	 * 인가 코드는 **한 번만 쓸 수 있다.** 같은 코드로 두 번 부르면 카카오가 거절하므로
	 * 프론트에서 콜백 화면이 두 번 렌더링되지 않게 하는 것이 짝이 되는 방어다.
	 */
	private fun exchangeToken(authorizationCode: String, redirectUri: String): String {
		val token = call(
			webClient.post()
				.uri(TOKEN_URI)
				.contentType(MediaType.APPLICATION_FORM_URLENCODED)
				.body(BodyInserters.fromFormData(tokenForm(authorizationCode, redirectUri))),
			KakaoTokenRes::class.java,
		)

		val accessToken = token?.accessToken
		if (accessToken == null) {
			log.warn("카카오 토큰 응답에 access_token 이 없다")
			throw CustomException(AuthErrorCode.AUTH_KAKAO_FAILED)
		}
		return accessToken
	}

	/**
	 * 토큰 교환 폼. 카카오가 검사하는 값이 그대로 여기 있다.
	 *
	 * **`client_secret` 은 값이 있을 때만 싣는다.** 콘솔에서 Client Secret 을 켜지 않은 앱은
	 * 카카오가 이 파라미터를 요구하지 않고, 빈 문자열을 실어 보내면 불일치로 거절될 수 있다.
	 * 켠 앱에서는 필수이므로 값이 있으면 반드시 실린다.
	 */
	internal fun tokenForm(authorizationCode: String, redirectUri: String): MultiValueMap<String, String> {
		val form: MultiValueMap<String, String> = LinkedMultiValueMap()
		form.add("grant_type", "authorization_code")
		form.add("client_id", clientId)
		form.add("redirect_uri", redirectUri)
		form.add("code", authorizationCode)
		if (clientSecret.isNotBlank()) {
			form.add("client_secret", clientSecret)
		}
		return form
	}

	private fun fetchUserInfo(kakaoAccessToken: String): KakaoUser {
		val user = call(
			webClient.get()
				.uri(USER_INFO_URI)
				.header("Authorization", "Bearer $kakaoAccessToken"),
			KakaoUserRes::class.java,
		)

		val id = user?.id
		val nickname = user?.nickname()
		if (user == null || id == null || nickname == null) {
			log.warn("카카오 사용자 정보가 부족하다 id={} nickname={}", id, nickname)
			// 닉네임은 필수 동의 항목이다. 없다면 콘솔의 동의항목 설정이 우리 가정과 다른 것이므로
			// 이름 없는 계정을 만들지 않고 실패로 끝낸다.
			throw CustomException(AuthErrorCode.AUTH_KAKAO_FAILED)
		}
		return KakaoUser(id, nickname, user.profileImageUrl())
	}

	private fun <T : Any> call(spec: WebClient.RequestHeadersSpec<*>, type: Class<T>): T? {
		try {
			return spec.retrieve()
				.onStatus({ status -> status.isError }) { response ->
					response.bodyToMono(String::class.java)
						.defaultIfEmpty("")
						.map<Throwable> { body ->
							// 사용자에게는 사유를 알리지 않지만 서버는 알아야 한다. 이 로그가 없으면
							// 코드 만료·redirect_uri 불일치·동의항목 문제가 전부 같은 401 로만 보인다.
							log.warn("카카오 호출 실패 status={} body={}", response.statusCode(), body)
							CustomException(AuthErrorCode.AUTH_KAKAO_FAILED)
						}
				}
				.bodyToMono(type)
				.block(TIMEOUT)
		} catch (e: CustomException) {
			throw e
		} catch (e: RuntimeException) {
			// 네트워크 단절·타임아웃(block 이 IllegalStateException 을 던진다)·본문 파싱 실패.
			// 어느 쪽이든 로그인은 성립하지 않는다.
			throw CustomException(AuthErrorCode.AUTH_KAKAO_FAILED)
		}
	}

	/** 카카오 토큰 응답. 우리가 쓰는 것은 access_token 하나뿐이다. */
	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KakaoTokenRes(
		@param:JsonProperty("access_token") val accessToken: String?,
	)

	/**
	 * 카카오 사용자 정보 응답. 실제 구조는
	 * `{ "id": 1, "kakao_account": { "profile": { "nickname": ..., "profile_image_url": ... } } }` 이다.
	 * 중첩을 그대로 받되 밖으로는 평평하게 노출한다.
	 */
	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KakaoUserRes(
		val id: Long?,
		@param:JsonProperty("kakao_account") val kakaoAccount: KakaoAccount?,
	) {

		fun nickname(): String? = kakaoAccount?.profile?.nickname

		fun profileImageUrl(): String? = kakaoAccount?.profile?.profileImageUrl
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class KakaoAccount(val profile: Profile?)

	@JsonIgnoreProperties(ignoreUnknown = true)
	private data class Profile(
		val nickname: String?,
		@param:JsonProperty("profile_image_url") val profileImageUrl: String?,
	)

	companion object {

		private val log = LoggerFactory.getLogger(KakaoOAuthClient::class.java)

		private const val TOKEN_URI = "https://kauth.kakao.com/oauth/token"

		private const val USER_INFO_URI = "https://kapi.kakao.com/v2/user/me"

		/**
		 * 카카오가 응답하지 않을 때 요청 스레드를 무한정 붙잡지 않게 하는 상한.
		 * 로그인은 사용자가 기다리는 화면이라 길게 잡을 이유가 없다.
		 */
		private val TIMEOUT: Duration = Duration.ofSeconds(5)
	}
}
