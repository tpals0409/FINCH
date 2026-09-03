package com.finch.domain.auth.service

import com.finch.domain.auth.dto.request.KakaoLoginReq
import com.finch.domain.auth.entity.User
import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.domain.auth.repository.UserRepository
import com.finch.global.exception.CustomException
import com.finch.global.security.JwtProvider
import com.finch.global.security.RefreshTokenStore
import java.util.Optional
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers
import org.mockito.ArgumentMatchers.anyLong
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.test.util.ReflectionTestUtils

/** 로그인 한 번의 조립이 맞는지 본다. 카카오와 DB 는 흉내내고 토큰만 진짜로 발급한다. */
@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

	@Mock
	private lateinit var kakaoOAuthClient: KakaoOAuthClient

	@Mock
	private lateinit var userRepository: UserRepository

	@Mock
	private lateinit var refreshTokenStore: RefreshTokenStore

	private val jwtProvider = JwtProvider(SECRET)

	private lateinit var authService: AuthService

	@BeforeEach
	fun setUp() {
		authService = AuthService(kakaoOAuthClient, userRepository, jwtProvider, refreshTokenStore)
	}

	@Test
	@DisplayName("처음 보는 kakaoId 면 계정을 만들고 isNewUser 가 true 다")
	fun registersOnFirstLogin() {
		given(kakaoOAuthClient.fetchUser(anyString(), anyString())).willReturn(KAKAO_USER)
		given(userRepository.findByKakaoId(KAKAO_USER.kakaoId)).willReturn(Optional.empty())
		given(userRepository.save(anyOf(User::class.java))).willReturn(userWithId(1L, "홍길동"))

		val result = authService.loginWithKakao(REQUEST)

		assertThat(result.body.isNewUser).isTrue()
		assertThat(result.body.user.userId).isEqualTo(1L)
		// 토큰이 진짜 그 사용자를 가리키는지까지 본다. 발급만 되고 다른 id 가 박히면 조용히 남의 계정이 된다.
		assertThat(jwtProvider.parseAccessToken(result.body.accessToken)).isEqualTo(1L)
		assertThat(jwtProvider.parseRefreshToken(result.refreshToken)).isEqualTo(1L)
	}

	@Test
	@DisplayName("이미 있는 kakaoId 면 가입하지 않고 프로필만 갱신한다")
	fun updatesProfileOnReturningLogin() {
		val existing = userWithId(7L, "예전이름")
		given(kakaoOAuthClient.fetchUser(anyString(), anyString())).willReturn(KAKAO_USER)
		given(userRepository.findByKakaoId(KAKAO_USER.kakaoId)).willReturn(Optional.of(existing))
		given(userRepository.save(existing)).willReturn(existing)

		val result = authService.loginWithKakao(REQUEST)

		assertThat(result.body.isNewUser).isFalse()
		assertThat(result.body.user.userId).isEqualTo(7L)
		assertThat(result.body.user.nickname).isEqualTo("홍길동")
	}

	@Test
	@DisplayName("동시 가입 경합에서 진 요청도 성공하고, isNewUser 는 false 다")
	fun losesRegistrationRaceButStillLogsIn() {
		val createdByOther = userWithId(9L, "홍길동")
		given(kakaoOAuthClient.fetchUser(anyString(), anyString())).willReturn(KAKAO_USER)
		// 처음엔 없다고 보고, 저장에서 제약에 막히고, 다시 조회하면 남이 만든 행이 있다.
		given(userRepository.findByKakaoId(KAKAO_USER.kakaoId))
			.willReturn(Optional.empty(), Optional.of(createdByOther))
		given(userRepository.save(anyOf(User::class.java)))
			.willThrow(DataIntegrityViolationException("uq_users_kakao_id"))

		val result = authService.loginWithKakao(REQUEST)

		assertThat(result.body.user.userId).isEqualTo(9L)
		// 이 요청이 만든 계정이 아니다. true 로 주면 나중에 최초 로그인 지급을 붙였을 때 두 번 지급된다.
		assertThat(result.body.isNewUser).isFalse()
	}

	@Test
	@DisplayName("카카오 인증이 실패하면 DB 를 건드리지 않고 그대로 올린다")
	fun doesNotTouchDatabaseWhenKakaoFails() {
		given(kakaoOAuthClient.fetchUser(anyString(), anyString()))
			.willThrow(CustomException(AuthErrorCode.AUTH_KAKAO_FAILED))

		assertThatThrownBy { authService.loginWithKakao(REQUEST) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_KAKAO_FAILED)
		verifyNoInteractions(userRepository)
	}

	@Test
	@DisplayName("재로그인에서 프로필이 그대로면 save 는 호출하되 값은 그대로다")
	fun keepsProfileWhenUnchanged() {
		val existing = userWithId(3L, "홍길동")
		ReflectionTestUtils.setField(existing, "profileImageUrl", "https://img.kakao/1.jpg")
		given(kakaoOAuthClient.fetchUser(anyString(), anyString())).willReturn(KAKAO_USER)
		given(userRepository.findByKakaoId(KAKAO_USER.kakaoId)).willReturn(Optional.of(existing))
		given(userRepository.save(existing)).willReturn(existing)

		val result = authService.loginWithKakao(REQUEST)

		assertThat(result.body.user.profileImageUrl).isEqualTo("https://img.kakao/1.jpg")
	}

	@Test
	@DisplayName("저장된 Refresh 와 일치하면 Access 를 새로 주고 Refresh 도 회전한다")
	fun rotatesOnRefresh() {
		val oldRefresh = jwtProvider.createRefreshToken(7L)
		given(refreshTokenStore.matches(7L, oldRefresh)).willReturn(true)

		val tokens = authService.refresh(oldRefresh)

		assertThat(jwtProvider.parseAccessToken(tokens.accessToken)).isEqualTo(7L)
		assertThat(tokens.refreshToken).isNotEqualTo(oldRefresh)
		// 새 Refresh 가 저장돼야 다음 재발급이 성립한다. 저장을 빠뜨리면 한 번만 되고 끊긴다.
		verify(refreshTokenStore).save(7L, tokens.refreshToken)
	}

	@Test
	@DisplayName("서명이 유효해도 저장된 것과 다르면 거부한다 — 회전 충돌")
	fun rejectsRotatedRefreshToken() {
		val stale = jwtProvider.createRefreshToken(7L)
		given(refreshTokenStore.matches(7L, stale)).willReturn(false)

		assertThatThrownBy { authService.refresh(stale) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
		verify(refreshTokenStore, never()).save(anyLong(), anyString())
	}

	@Test
	@DisplayName("Access 토큰을 Refresh 자리에 넣으면 저장소를 보기도 전에 거부한다")
	fun rejectsAccessTokenOnRefresh() {
		val access = jwtProvider.createAccessToken(7L)

		assertThatThrownBy { authService.refresh(access) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(AuthErrorCode.AUTH_INVALID_TOKEN)
		verifyNoInteractions(refreshTokenStore)
	}

	@Test
	@DisplayName("로그아웃은 저장된 Refresh 를 지운다 — 쿠키만 지우면 서버는 계속 재발급해 준다")
	fun logoutDeletesStoredToken() {
		authService.logout(7L)

		verify(refreshTokenStore).delete(7L)
	}

	@Test
	@DisplayName("로그인은 Refresh 를 발급과 동시에 저장한다")
	fun savesRefreshTokenOnLogin() {
		given(kakaoOAuthClient.fetchUser(anyString(), anyString())).willReturn(KAKAO_USER)
		given(userRepository.findByKakaoId(KAKAO_USER.kakaoId)).willReturn(Optional.empty())
		given(userRepository.save(anyOf(User::class.java))).willReturn(userWithId(1L, "홍길동"))

		val result = authService.loginWithKakao(REQUEST)

		verify(refreshTokenStore).save(1L, result.refreshToken)
	}

	/** 엔티티에 id 세터가 없다. DB 가 채우는 값이라 테스트에서만 리플렉션으로 넣는다. */
	private fun userWithId(id: Long, nickname: String): User {
		val user = User.register(KAKAO_USER.kakaoId, nickname, null)
		ReflectionTestUtils.setField(user, "id", id)
		return user
	}

	companion object {

		private const val SECRET = "finch-test-secret-key-0123456789-abcdefgh"

		private val KAKAO_USER = KakaoUser(1234567890L, "홍길동", "https://img.kakao/1.jpg")

		private val REQUEST = KakaoLoginReq("code", "http://localhost:5173/oauth/kakao")

		/**
		 * Mockito 의 any(...) 는 null 을 돌려주는데, Kotlin 은 non-null 파라미터 자리에 플랫폼 값이 오면
		 * 호출부에 null 검사를 끼워 넣어 그 자리에서 터진다. 제네릭으로 한 겹 감싸면 검사가 생기지 않는다.
		 */
		private fun <T> anyOf(type: Class<T>): T = ArgumentMatchers.any(type)
	}
}
