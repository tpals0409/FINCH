package com.finch.global.security

import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.global.apiPayload.code.BaseErrorCode
import com.finch.global.exception.CustomException
import io.jsonwebtoken.Claims
import io.jsonwebtoken.ExpiredJwtException
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * Access·Refresh 토큰의 발급과 검증을 한곳에 모은다. 토큰 형식을 아는 유일한 클래스다.
 *
 * 만료를 두 코드로 가르는 것이 이 클래스의 핵심 계약이다 (apiSpec 1.2 / 2.2).
 * Access 만료는 `AUTH_TOKEN_EXPIRED` — 프론트 인터셉터가 이 코드에서만 재발급을 시도한다.
 * Refresh 만료는 `AUTH_INVALID_TOKEN` — 재발급 응답에 EXPIRED 를 주면 인터셉터가 다시 재발급을
 * 시도해 무한 루프가 된다. 그래서 만료 판정 자체는 같아도 나가는 코드가 다르다.
 *
 * 서명 키는 `jwt.secret` 으로 주입받는다. 기본값이 없으므로 `JWT_SECRET` 이 비어 있으면
 * 앱이 기동하지 못하고 그 변수 이름을 알려주며 죽는다 — application.yaml 의 비밀값 규칙과 같다.
 */
@Component
class JwtProvider internal constructor(
	secret: String,
	private val accessTokenTtl: Duration,
	private val refreshTokenTtl: Duration,
) {

	/**
	 * @param secret HMAC-SHA256 서명 키. UTF-8 32바이트(=256비트) 이상이어야 하고,
	 *               짧으면 jjwt 가 `WeakKeyException` 으로 생성을 거부한다.
	 *               짧은 키는 무차별 대입으로 위조가 가능해 서명이 있어도 없는 것과 같다.
	 */
	@Autowired
	constructor(@Value("\${jwt.secret}") secret: String) : this(secret, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL)

	private val key: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

	fun createAccessToken(userId: Long): String = create(userId, TYPE_ACCESS, accessTokenTtl)

	fun createRefreshToken(userId: Long): String = create(userId, TYPE_REFRESH, refreshTokenTtl)

	/**
	 * @return 토큰이 가리키는 사용자 ID
	 * @throws CustomException 만료면 `AUTH_TOKEN_EXPIRED`, 그 밖의 모든 실패는 `AUTH_INVALID_TOKEN`
	 */
	fun parseAccessToken(token: String?): Long = parse(token, TYPE_ACCESS, AuthErrorCode.AUTH_TOKEN_EXPIRED)

	/**
	 * @return 토큰이 가리키는 사용자 ID
	 * @throws CustomException 만료를 포함해 모든 실패가 `AUTH_INVALID_TOKEN` (apiSpec 2.2)
	 */
	fun parseRefreshToken(token: String?): Long = parse(token, TYPE_REFRESH, AuthErrorCode.AUTH_INVALID_TOKEN)

	private fun create(userId: Long, tokenType: String, ttl: Duration): String {
		val now = Instant.now()
		return Jwts.builder()
			.subject(userId.toString())
			.claim(CLAIM_TOKEN_TYPE, tokenType)
			// exp·iat 는 초 단위라 같은 초에 두 번 발급하면 토큰 문자열이 완전히 같아진다.
			// Refresh 회전은 "직전 토큰과 다른 토큰" 을 전제로 하므로 발급마다 유일한 값이 필요하다.
			.id(UUID.randomUUID().toString())
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plus(ttl)))
			// 알고리즘을 명시한다. 생략하면 키 길이에 따라 HS384·HS512 가 선택돼
			// 서명 키를 긴 값으로 바꾼 환경만 조용히 다른 알고리즘을 쓰게 된다.
			.signWith(key, Jwts.SIG.HS256)
			.compact()
	}

	private fun parse(token: String?, expectedType: String, expiredErrorCode: BaseErrorCode): Long {
		val claims = readClaims(token, expiredErrorCode)

		if (expectedType != claims.get(CLAIM_TOKEN_TYPE, String::class.java)) {
			throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
		}

		try {
			return claims.subject.toLong()
		} catch (e: NumberFormatException) {
			// 우리가 발급한 토큰이면 일어나지 않는다. 서명이 유효한데 sub 가 숫자가 아니라면
			// 같은 키로 서명한 다른 형식의 토큰이므로 무효로 본다.
			throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
		}
	}

	private fun readClaims(token: String?, expiredErrorCode: BaseErrorCode): Claims {
		try {
			return Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.payload
		} catch (e: ExpiredJwtException) {
			// ExpiredJwtException 은 JwtException 의 하위 타입이다. 아래 catch 보다 먼저 와야 하며
			// 순서를 바꾸면 만료가 전부 INVALID 로 뭉개져 프론트가 재발급을 못 한다.
			throw CustomException(expiredErrorCode)
		} catch (e: JwtException) {
			// JwtException — 서명 불일치·형식 오류. IllegalArgumentException — null·빈 문자열.
			// 어느 쪽이 틀렸는지 응답으로 알려주지 않는다. 공격자에게 힌트가 된다.
			throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
		} catch (e: IllegalArgumentException) {
			throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
		}
	}

	companion object {

		/**
		 * apiSpec 1.2 — Access 30분. 프론트 인터셉터의 재발급 시점 기준이라 환경별로 달라지면 안 되므로
		 * 설정이 아니라 상수로 둔다. 환경변수로 빼는 것은 비밀값(서명 키)뿐이다.
		 */
		@JvmField
		val ACCESS_TOKEN_TTL: Duration = Duration.ofMinutes(30)

		/** apiSpec 1.2 — Refresh 14일. 쿠키의 `Max-Age=1209600` 과 같은 값이어야 한다. */
		@JvmField
		val REFRESH_TOKEN_TTL: Duration = Duration.ofDays(14)

		/**
		 * 토큰의 용도를 담는 클레임. 두 토큰이 같은 키로 서명되므로 이 값이 없으면
		 * Refresh 를 `Authorization` 헤더에 넣어도 서명이 맞아 통과한다 — 14일짜리 Access 가 되는 셈이다.
		 *
		 * 이름을 `typ` 로 하지 않았다. `typ` 는 JWS **헤더**의 등록된 이름이라
		 * 페이로드에 같은 이름을 두면 읽는 사람이 헤더의 그것과 헷갈린다.
		 */
		internal const val CLAIM_TOKEN_TYPE = "tokenType"

		internal const val TYPE_ACCESS = "access"

		internal const val TYPE_REFRESH = "refresh"

		private const val BEARER_PREFIX = "Bearer "

		/**
		 * `Authorization: Bearer <토큰>` 헤더에서 토큰만 떼어 낸다.
		 *
		 * 헤더가 없거나 `Bearer ` 형식이 아니면 `AUTH_INVALID_TOKEN` 이다 (apiSpec 1.2).
		 * 누락을 만료로 주면 프론트가 재발급을 시도하고, 재발급이 성공하면 **원래 토큰을 안 붙인 버그가 가려진다.**
		 */
		fun resolveBearerToken(authorizationHeader: String?): String {
			if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
				throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
			}
			return authorizationHeader.substring(BEARER_PREFIX.length)
		}
	}
}
