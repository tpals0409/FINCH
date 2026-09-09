package com.finch.global.config

import com.finch.global.security.JwtProvider
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.TestPropertySource
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(controllers = [InternalApiSecurityTest.StubController::class])
@Import(InternalApiSecurityTest.StubController::class, SecurityConfig::class)
@TestPropertySource(properties = ["finch.ai.internal-token=test-internal-token"])
class InternalApiSecurityTest {

	@Autowired
	private lateinit var mockMvc: MockMvc

	@MockitoBean
	private lateinit var jwtProvider: JwtProvider

	@Test
	@DisplayName("portfolio 내부 API는 토큰이 없으면 401이다")
	fun portfolioRequiresInternalToken() {
		mockMvc.perform(get("/internal/v1/portfolio").header("X-User-Id", "1"))
			.andExpect(status().isUnauthorized)
	}

	@Test
	@DisplayName("trades 내부 API는 잘못된 토큰이면 401이다")
	fun tradesRejectsWrongInternalToken() {
		mockMvc.perform(
			get("/internal/v1/trades")
				.header("X-Internal-Token", "wrong")
				.header("X-User-Id", "1"),
		)
			.andExpect(status().isUnauthorized)
	}

	@Test
	@DisplayName("내부 API는 올바른 토큰과 사용자 ID면 컨트롤러까지 도달한다")
	fun internalEndpointsAcceptValidCredentials() {
		mockMvc.perform(
			get("/internal/v1/portfolio")
				.header("X-Internal-Token", "test-internal-token")
				.header("X-User-Id", "1"),
		)
			.andExpect(status().isOk)
		mockMvc.perform(
			get("/internal/v1/trades")
				.header("X-Internal-Token", "test-internal-token")
				.header("X-User-Id", "1"),
		)
			.andExpect(status().isOk)
	}

	@Test
	@DisplayName("전역 가격 유니버스는 사용자 ID 없이 올바른 내부 토큰이면 도달한다")
	fun priceUniverseAcceptsServiceTokenWithoutUserId() {
		mockMvc.perform(
			get("/internal/v1/ai/price-universe")
				.header("X-Internal-Token", "test-internal-token"),
		)
			.andExpect(status().isOk)
	}

	@RestController
	class StubController {
		@GetMapping("/internal/v1/portfolio")
		fun portfolio() = "ok"

		@GetMapping("/internal/v1/trades")
		fun trades() = "ok"

		@GetMapping("/internal/v1/ai/price-universe")
		fun priceUniverse() = "ok"
	}
}
