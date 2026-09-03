package com.finch.domain.auth.service

import com.finch.domain.auth.dto.request.KakaoLoginReq
import com.finch.domain.auth.dto.response.AuthUserRes
import com.finch.domain.auth.dto.response.KakaoLoginRes
import com.finch.domain.auth.entity.User
import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.domain.auth.repository.UserRepository
import com.finch.global.exception.CustomException
import com.finch.global.security.JwtProvider
import com.finch.global.security.RefreshTokenStore
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service

/**
 * 카카오 로그인 한 번의 흐름을 조립한다 — 카카오에 신원 확인 → 회원 조회·가입 → 우리 토큰 발급.
 *
 * **메서드에 `@Transactional` 을 붙이지 않았다.** 이유가 두 개다.
 * 1. 카카오 HTTP 호출이 트랜잭션 안에 들어가면 카카오가 느린 동안 DB 커넥션을 붙잡는다.
 *    커넥션 풀은 카카오 응답 시간과 무관해야 한다.
 * 2. 동시 가입 경합을 처리할 수 없게 된다. 제약 위반이 난 트랜잭션은 rollback-only 로 표시되므로
 *    같은 트랜잭션 안에서 예외를 잡아 다시 조회해도 커밋에서 다시 실패한다.
 *    트랜잭션 밖에서 잡으면 재조회가 새 트랜잭션으로 나가 정상 동작한다.
 *
 * 리포지토리 호출은 각각이 자기 트랜잭션이다(Spring Data 기본). 그래서 프로필 갱신은
 * 영속 상태에 의존하지 않고 `save` 로 명시한다.
 *
 * ⚠️ **최초 로그인의 계좌·예수금 생성은 아직 없다.** erd.md 3.1 은 `users` INSERT 와 함께
 * `account`·`ledger_entry` 를 한 트랜잭션에서 만들라고 하지만 그 테이블의 소유 도메인
 * (`account`·`ledger`)이 아직 없다.
 *
 * 붙일 때 **이 메서드를 `@Transactional` 로 감싸면 안 된다.** 위의 두 이유를 그대로 밟는다.
 * 트랜잭션 경계는 **카카오 호출 밖의 별도 메서드**여야 한다 — `AccountService.openAccount` 를
 * `Propagation.MANDATORY` 로 두고, 이 클래스에서 카카오 호출이 끝난 뒤 `@Transactional` 을 건
 * 얇은 메서드로 감싸 부른다. 그 안에서 계좌 생성 · 원장 기록 · 잔액 반영이 한 트랜잭션이 된다.
 *
 * 그리고 **중복 지급을 막는 방어선은 아래 `created` 플래그가 아니다.** 그 플래그는 "이 요청이
 * 계정을 만들었는지" 일 뿐이라 동시 가입에서 둘 다 참이 될 수 있다. 진짜 방어선은 스키마의
 * `uq_account_user` UNIQUE 이고, `INITIAL_GRANT` 가 계정당 정확히 1건이라는 apiSpec 8.2 의
 * 전제는 그 제약이 지킨다.
 */
@Service
class AuthService(
	private val kakaoOAuthClient: KakaoOAuthClient,
	private val userRepository: UserRepository,
	private val jwtProvider: JwtProvider,
	private val refreshTokenStore: RefreshTokenStore,
) {

	fun loginWithKakao(request: KakaoLoginReq): LoginResult {
		val kakaoUser = kakaoOAuthClient.fetchUser(request.authorizationCode, request.redirectUri)

		val resolved = userRepository.findByKakaoId(kakaoUser.kakaoId)
			.map { existing -> Resolved(updateProfile(existing, kakaoUser), false) }
			.orElseGet { register(kakaoUser) }

		val user = resolved.user
		val body = KakaoLoginRes(
			jwtProvider.createAccessToken(user.id!!),
			resolved.created,
			AuthUserRes.from(user),
		)

		return LoginResult(body, issueRefreshToken(user.id!!))
	}

	/**
	 * 쿠키의 Refresh Token 으로 Access Token 을 다시 발급한다 (apiSpec 2.2).
	 *
	 * **Refresh 도 함께 새로 내려간다(회전).** 옛 토큰은 저장소에서 덮어써져 그 즉시 무효가 된다.
	 * 그래서 유출된 토큰을 공격자가 먼저 쓰면 정상 사용자의 다음 재발급이 실패하고, 탈취가 드러난다.
	 *
	 * 실패는 전부 `AUTH_INVALID_TOKEN` 이다 — 만료든 서명 불일치든 회전 충돌이든. 쿠키 자체가 없는
	 * 경우만 `AUTH_REFRESH_TOKEN_MISSING` 이고 그 판정은 컨트롤러가 한다(쿠키 유무는 HTTP 의 일이다).
	 */
	fun refresh(refreshToken: String): TokenPair {
		val userId = jwtProvider.parseRefreshToken(refreshToken)

		if (!refreshTokenStore.matches(userId, refreshToken)) {
			// 서명도 맞고 만료도 아닌데 저장된 것과 다르다 = 이미 회전에 쓰였거나 로그아웃된 토큰이다.
			// 서명 검증만으로는 잡을 수 없어서 저장소가 필요하다.
			throw CustomException(AuthErrorCode.AUTH_INVALID_TOKEN)
		}

		return TokenPair(jwtProvider.createAccessToken(userId), issueRefreshToken(userId))
	}

	/**
	 * 로그아웃 (apiSpec 2.3). 저장된 Refresh 를 지워 재발급을 막는다.
	 *
	 * Access Token 은 무상태라 서버가 회수할 수 없다. 남은 최대 30분은 그대로 유효하고,
	 * 그 창을 좁히는 것이 Access 를 짧게 잡은 이유다. 로그아웃이 즉시 끊는 것은 **재발급 경로**다.
	 */
	fun logout(userId: Long) {
		refreshTokenStore.delete(userId)
	}

	/** 발급과 저장은 항상 같이 일어난다. 저장을 빠뜨리면 그 토큰으로는 재발급이 안 된다. */
	private fun issueRefreshToken(userId: Long): String {
		val refreshToken = jwtProvider.createRefreshToken(userId)
		refreshTokenStore.save(userId, refreshToken)
		return refreshToken
	}

	/** 카카오에서 닉네임·프로필이 바뀌었으면 반영한다. 같은 값이면 변경 감지가 UPDATE 를 만들지 않는다. */
	private fun updateProfile(user: User, kakaoUser: KakaoUser): User {
		user.updateProfile(kakaoUser.nickname, kakaoUser.profileImageUrl)
		return userRepository.save(user)
	}

	private fun register(kakaoUser: KakaoUser): Resolved {
		return try {
			Resolved(
				userRepository.save(
					User.register(kakaoUser.kakaoId, kakaoUser.nickname, kakaoUser.profileImageUrl)
				),
				true,
			)
		} catch (e: DataIntegrityViolationException) {
			// 로그인 버튼을 빠르게 두 번 눌러 두 요청이 모두 "없음" 을 본 경우다.
			// `uq_users_kakao_id` 가 둘째를 막았으므로 계정이 2개 생기지는 않는다. 다시 조회해 이어간다.
			// created 는 false 다 — 이 요청이 만든 것이 아니다. 여기서 true 를 주면 나중에
			// 최초 로그인 지급(erd.md 3.1)을 붙였을 때 한 계정에 두 번 지급될 수 있다.
			Resolved(
				userRepository.findByKakaoId(kakaoUser.kakaoId)
					.orElseThrow { CustomException(AuthErrorCode.AUTH_KAKAO_FAILED) },
				false,
			)
		}
	}

	/** 조회·가입의 결과. `created` 는 **이 요청이** 계정을 만들었는지다. */
	private data class Resolved(val user: User, val created: Boolean)
}
