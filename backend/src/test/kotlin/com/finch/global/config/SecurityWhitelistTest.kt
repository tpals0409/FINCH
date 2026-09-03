package com.finch.global.config

import com.finch.global.security.JwtProvider
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RestController

/**
 * `SecurityConfig.PUBLIC_PATHS` 의 **경로 패턴이 실제로 매칭되는지**만 본다.
 *
 * [SecurityConfigTest] 와 역할이 다르다. 그쪽은 앱을 통째로 띄워 **진짜 actuator 엔드포인트가
 * 200 을 주는지** 보고, 그래서 Docker(Testcontainers)가 필요하다. 이 테스트는 같은 경로에 스텁
 * 컨트롤러를 얹어 **인증 규칙만** 떼어 본다 — DB·Redis 없이 돌기 때문에 Docker 가 없는 환경에서도
 * 규칙이 지켜지는지 확인할 수 있다.
 *
 * 둘 다 필요한 이유 — 화이트리스트 경로에 오타가 나면 쿠버네티스 readinessProbe 가 401 을 받아
 * **배포가 아무 로그도 남기지 않고 롤백된다** (SecurityConfig 주석). 그 사고를 Docker 가 없어서
 * 발견하지 못하는 상황을 만들지 않으려고 규칙 검사만 따로 뗐다.
 */
@WebMvcTest(controllers = [SecurityWhitelistTest.StubController::class])
@Import(SecurityWhitelistTest.StubController::class, SecurityConfig::class)
class SecurityWhitelistTest {

	@Autowired
	private lateinit var mockMvc: MockMvc

	/** SecurityConfig 가 필터를 조립할 때 쓴다. 이 테스트는 토큰을 보내지 않는다. */
	@MockitoBean
	private lateinit var jwtProvider: JwtProvider

	@Test
	@DisplayName("readinessProbe 경로는 인증 규칙에서 열려 있다")
	fun readinessPathIsPermitted() {
		mockMvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk)
	}

	@Test
	@DisplayName("livenessProbe 경로는 인증 규칙에서 열려 있다")
	fun livenessPathIsPermitted() {
		mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk)
	}

	// Kotlin 의 블록 주석은 중첩되므로 `/**` 를 담은 문장은 줄 주석으로 적는다.
	// `/actuator/health/**` 는 하위 경로가 없는 `/actuator/health` 자체도 포함한다.
	@Test
	@DisplayName("actuator health 자체 경로도 열려 있다")
	fun healthPathIsPermitted() {
		mockMvc.perform(get("/actuator/health")).andExpect(status().isOk)
	}

	@Test
	@DisplayName("Prometheus scrape 경로는 인증 규칙에서 열려 있다")
	fun prometheusPathIsPermitted() {
		mockMvc.perform(get("/actuator/prometheus")).andExpect(status().isOk)
	}

	@Test
	@DisplayName("카카오 로그인은 무인증이다 — 로그인 전이라 토큰이 있을 수 없다")
	fun kakaoLoginIsPermitted() {
		mockMvc.perform(post("/api/v1/auth/kakao")).andExpect(status().isOk)
	}

	@Test
	@DisplayName("재발급은 무인증이다 — Access 가 만료됐을 때 부르는 API 다")
	fun refreshIsPermitted() {
		mockMvc.perform(post("/api/v1/auth/refresh")).andExpect(status().isOk)
	}

	/**
	 * 화이트리스트에 메서드를 함께 지정하지 않은 이유를 못 박는다. `POST` 만 열면 경로가 존재하는데도
	 * 401 이 나가는데, apiSpec 11.1 은 그 경우를 405 METHOD_NOT_ALLOWED 로 정했다.
	 */
	@Test
	@DisplayName("무인증 경로에 잘못된 메서드로 오면 401 이 아니라 405 다")
	fun wrongMethodOnPublicPathIsMethodNotAllowed() {
		mockMvc.perform(get("/api/v1/auth/kakao")).andExpect(status().isMethodNotAllowed)
	}

	/** 화이트리스트 밖은 전부 인증이다. 이것이 200 이면 `permitAll()` 이 아직 살아 있는 것이다. */
	@Test
	@DisplayName("화이트리스트 밖 경로는 토큰 없이 401 이다")
	fun otherPathsRequireAuthentication() {
		mockMvc.perform(get("/api/v1/anything")).andExpect(status().isUnauthorized)
	}

	@Test
	@DisplayName("로그아웃은 화이트리스트에 없다 — Access Token 이 있어야 한다")
	fun logoutRequiresAuthentication() {
		mockMvc.perform(post("/api/v1/auth/logout")).andExpect(status().isUnauthorized)
	}

	/**
	 * 진짜 엔드포인트 대신 얹는 껍데기다. 여기서 보는 것은 요청이 컨트롤러까지 **닿는지**이고,
	 * 그 경로가 무엇을 응답하는지는 [SecurityConfigTest] 가 본다.
	 */
	@RestController
	class StubController {

		@GetMapping(
			value = [
				"/actuator/health", "/actuator/health/readiness", "/actuator/health/liveness",
				"/actuator/prometheus", "/api/v1/anything",
			]
		)
		fun open() {
		}

		@PostMapping(value = ["/api/v1/auth/kakao", "/api/v1/auth/refresh", "/api/v1/auth/logout"])
		fun posted() {
		}
	}
}
