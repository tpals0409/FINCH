package com.finch.domain.auth.service

import com.finch.domain.account.service.AccountService
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
 * **계좌·초기 예수금 생성은 `AccountService.openAccountIfAbsent` 가 한다.** 카카오 호출이 끝난 뒤
 * 부르므로 위의 두 이유를 밟지 않는다 — 그 메서드가 자기 트랜잭션을 열고, 그 안에서 계좌 생성 ·
 * 원장 기록 · 잔액 반영이 한 트랜잭션이 된다.
 *
 * **`created` 플래그를 조건으로 걸지 않고 모든 로그인에서 부른다.** 그 플래그는 "이 요청이 계정을
 * 만들었는지" 일 뿐이고, 기존 사용자(V2 가 보존한 카카오 검증 행)와 계좌 생성이 실패했던 사용자는
 * 조건을 걸면 영원히 계좌를 못 받는다. 자세한 이유는 그 메서드의 주석에 있다.
 *
 * 중복 지급을 막는 방어선은 그 플래그가 아니라 스키마의 `uq_account_user` 다. `INITIAL_GRANT` 가
 * 계정당 정확히 1건이라는 apiSpec 8.2 의 전제는 그 제약이 지킨다.
 */
@Service
class AuthService(
	private val kakaoOAuthClient: KakaoOAuthClient,
	private val userRepository: UserRepository,
	private val jwtProvider: JwtProvider,
	private val refreshTokenStore: RefreshTokenStore,
	private val accountService: AccountService,
) {

	fun loginWithKakao(request: KakaoLoginReq): LoginResult {
		val kakaoUser = kakaoOAuthClient.fetchUser(request.authorizationCode, request.redirectUri)

		val resolved = userRepository.findByKakaoId(kakaoUser.kakaoId)
			.map { existing -> Resolved(updateProfile(existing, kakaoUser), false) }
			.orElseGet { register(kakaoUser) }

		val user = resolved.user
		openAccount(user.id!!)

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

	/**
	 * 계좌가 없으면 만든다. **`DataIntegrityViolationException` 을 여기서 잡는 것이 핵심이다.**
	 *
	 * 트랜잭션은 `openAccountIfAbsent` 안에서 시작하고 끝난다. 그 안에서 잡으면 rollback-only 로
	 * 표시돼 커밋에서 다시 실패하므로, 트랜잭션 **밖**인 여기서 잡아야 재조회 없이 넘어갈 수 있다.
	 * `register` 가 `users` 에 대해 하는 것과 같은 구조다.
	 *
	 * 잡고 그냥 넘어가는 이유 — 동시 로그인 둘이 모두 "계좌 없음" 을 보고 각각 INSERT 를 시도한 경우다.
	 * `uq_account_user` 가 둘째를 막았으므로 계좌는 하나이고 초기 지급도 한 번이다. 이 요청이
	 * 만들지 않았을 뿐 결과는 같으니 로그인을 실패시킬 이유가 없다.
	 */
	private fun openAccount(userId: Long) {
		try {
			accountService.openAccountIfAbsent(userId)
		} catch (e: DataIntegrityViolationException) {
			// 다른 요청이 먼저 만들었다. 로그인은 계속한다.
		}
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
			// created 는 false 다 — 이 요청이 만든 것이 아니다. 이 값은 응답의 `isNewUser`(apiSpec 2.1)
			// 로만 쓰이고 초기 지급을 가르지 않는다. 지급 여부는 계좌의 존재로 판단한다.
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
