package com.finch.global.security

import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.global.exception.CustomException
import io.jsonwebtoken.security.WeakKeyException
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.Base64
import java.util.regex.Pattern
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

/**
 * apiSpec 1.2 · 2.2 의 토큰 계약을 고정한다. 프론트 인터셉터가 이 코드 구분에 의존하므로
 * 여기 통과 여부가 곧 로그인 흐름이 도는지 여부다.
 */
class JwtProviderTest {

	private val provider = JwtProvider(SECRET)

	@Test
	@DisplayName("발급한 Access 토큰에서 같은 userId 를 되찾는다")
	fun accessTokenRoundTrip() {
		val token = provider.createAccessToken(USER_ID)

		assertThat(provider.parseAccessToken(token)).isEqualTo(USER_ID)
	}

	@Test
	@DisplayName("발급한 Refresh 토큰에서 같은 userId 를 되찾는다")
	fun refreshTokenRoundTrip() {
		val token = provider.createRefreshToken(USER_ID)

		assertThat(provider.parseRefreshToken(token)).isEqualTo(USER_ID)
	}

	@Test
	@DisplayName("Access 는 30분, Refresh 는 14일 뒤에 만료된다")
	fun tokenLifetimesFollowSpec() {
		val access = payloadOf(provider.createAccessToken(USER_ID))
		val refresh = payloadOf(provider.createRefreshToken(USER_ID))

		assertThat(numberClaim(access, "exp") - numberClaim(access, "iat"))
			.isEqualTo(Duration.ofMinutes(30).toSeconds())
		assertThat(numberClaim(refresh, "exp") - numberClaim(refresh, "iat"))
			.isEqualTo(Duration.ofDays(14).toSeconds())
	}

	@Test
	@DisplayName("만료된 Access 토큰은 AUTH_TOKEN_EXPIRED — 프론트가 이 코드에서만 재발급한다")
	fun expiredAccessTokenIsExpiredCode() {
		val expired = expiredProvider().createAccessToken(USER_ID)

		assertThatThrownBy { provider.parseAccessToken(expired) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_TOKEN_EXPIRED)
	}

	@Test
	@DisplayName("만료된 Refresh 토큰은 EXPIRED 가 아니라 AUTH_INVALID_TOKEN — 재발급 무한 루프를 막는다")
	fun expiredRefreshTokenIsInvalidCode() {
		val expired = expiredProvider().createRefreshToken(USER_ID)

		assertThatThrownBy { provider.parseRefreshToken(expired) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@Test
	@DisplayName("Refresh 토큰을 Access 자리에 쓰면 거부한다 — 없으면 14일짜리 Access 가 된다")
	fun refreshTokenIsNotAcceptedAsAccessToken() {
		val refresh = provider.createRefreshToken(USER_ID)

		assertThatThrownBy { provider.parseAccessToken(refresh) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@Test
	@DisplayName("Access 토큰을 Refresh 자리에 쓰면 거부한다")
	fun accessTokenIsNotAcceptedAsRefreshToken() {
		val access = provider.createAccessToken(USER_ID)

		assertThatThrownBy { provider.parseRefreshToken(access) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@Test
	@DisplayName("다른 키로 서명한 토큰은 형식이 멀쩡해도 거부한다")
	fun tokenSignedWithAnotherKeyIsRejected() {
		val forged = JwtProvider(OTHER_SECRET).createAccessToken(USER_ID)

		assertThatThrownBy { provider.parseAccessToken(forged) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@ParameterizedTest
	@ValueSource(strings = ["", "   ", "not-a-jwt", "a.b.c", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiJ9"])
	@DisplayName("토큰이라 할 수 없는 문자열은 예외 종류를 가리지 않고 AUTH_INVALID_TOKEN 으로 모은다")
	fun malformedTokenIsRejected(malformed: String) {
		assertThatThrownBy { provider.parseAccessToken(malformed) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@Test
	@DisplayName("null 토큰도 500 이 아니라 AUTH_INVALID_TOKEN 이다")
	fun nullTokenIsRejected() {
		assertThatThrownBy { provider.parseAccessToken(null) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
	}

	@Test
	@DisplayName("같은 초에 두 번 발급한 Refresh 토큰은 서로 다르다 — 회전이 성립하려면 유일해야 한다")
	fun refreshTokensIssuedInSameSecondDiffer() {
		val first = provider.createRefreshToken(USER_ID)
		val second = provider.createRefreshToken(USER_ID)

		assertThat(first).isNotEqualTo(second)
	}

	@Test
	@DisplayName("payload 는 암호화가 아니라 인코딩이다 — 키 없이 sub 가 그대로 읽힌다")
	fun payloadIsNotEncrypted() {
		val payload = payloadOf(provider.createAccessToken(USER_ID))

		assertThat(payload.replace(" ", ""))
			.contains("\"sub\":\"" + USER_ID + "\"")
			.contains("\"tokenType\":\"access\"")
	}

	@Test
	@DisplayName("256비트보다 짧은 서명 키는 기동 시점에 거부한다 — 위조가 가능한 서명은 없는 것과 같다")
	fun shortSecretIsRejected() {
		assertThatThrownBy { JwtProvider("too-short") }
			.isInstanceOf(WeakKeyException::class.java)

		assertThatCode { JwtProvider(SECRET) }.doesNotThrowAnyException()
	}

	/** 만료를 기다리지 않고 시험하려고 TTL 을 음수로 준다. 서명 키는 같으므로 서명은 유효하다. */
	private fun expiredProvider(): JwtProvider =
		JwtProvider(SECRET, Duration.ofMinutes(-1), Duration.ofMinutes(-1))

	/**
	 * 서명 검증도, 키도 없이 가운데 조각만 Base64URL 디코드한다.
	 * 브라우저 콘솔이나 jwt.io 에서 하는 것과 같은 일이라 JSON 원문이 그대로 나온다.
	 */
	private fun payloadOf(token: String): String {
		val parts = token.split(".")
		return String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)
	}

	/** 테스트에 Jackson 을 끌어오지 않기 위해 숫자 클레임만 직접 뽑는다. */
	private fun numberClaim(payload: String, name: String): Long {
		val matcher = Pattern.compile("\"" + name + "\":[ ]*([0-9]+)").matcher(payload)
		assertThat(matcher.find()).`as`("%s 클레임이 payload 에 있다", name).isTrue()
		return matcher.group(1).toLong()
	}

	companion object {

		/** 32바이트 이상이어야 HS256 이 성립한다. 테스트 값이므로 실제 키와 무관하다. */
		private const val SECRET = "finch-test-secret-key-0123456789-abcdefgh"

		private const val OTHER_SECRET = "finch-other-secret-key-9876543210-zyxwvut"

		private const val USER_ID = 42L
	}
}
