package com.finch.global.filter

import com.finch.global.config.SecurityConfig
import com.finch.global.security.JwtProvider
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.slf4j.MDC
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/**
 * apiSpec 1.1 "모든 응답에 X-Request-Id 헤더를 싣는다" 를 고정한다.
 * 에러 응답에서 빠지면 정작 추적이 필요한 순간에 식별자가 없다.
 *
 * 필터가 실제 서블릿 체인에서 도는지 봐야 하므로 addFilters 를 끄지 않는다.
 * SecurityConfig 를 함께 올리는 이유 — 슬라이스 테스트의 기본 Security 는 전 경로에 401 을 내서
 * 스텁 컨트롤러까지 요청이 닿지 않는다.
 *
 * 스텁 경로는 SecurityConfig 의 화이트리스트 밖이므로 요청을 **인증된 것으로 만들어** 보낸다.
 * 어떻게 인증했는지는 이 테스트의 관심사가 아니라서 JWT 를 흉내내지 않고 `user(...)` 로 앉힌다.
 * `JwtProvider` 목은 SecurityConfig 가 필터를 조립할 때 필요해서 두는 것뿐이다.
 */
@WebMvcTest(controllers = [RequestIdFilterTest.StubController::class])
@Import(RequestIdFilterTest.StubController::class, RequestIdFilter::class, SecurityConfig::class)
class RequestIdFilterTest {

	@Autowired
	private lateinit var mockMvc: MockMvc

	/** SecurityConfig 가 JwtAuthenticationFilter 를 만들 때 쓴다. 이 테스트는 토큰을 다루지 않는다. */
	@MockitoBean
	private lateinit var jwtProvider: JwtProvider

	@Test
	@DisplayName("헤더 없이 온 요청에는 서버가 식별자를 만들어 응답 헤더와 MDC 에 같은 값을 둔다")
	fun generatesWhenAbsent() {
		val result = mockMvc.perform(get("/stub/echo").with(user("tester")))
			.andExpect(status().isOk)
			.andExpect(header().exists(RequestIdFilter.HEADER))
			.andReturn()

		val fromHeader = result.response.getHeader(RequestIdFilter.HEADER)
		val seenInsideController = result.response.contentAsString
		assertThat(fromHeader).isNotBlank()
		assertThat(seenInsideController).isEqualTo(fromHeader)
	}

	@Test
	@DisplayName("클라이언트가 보낸 형식에 맞는 식별자는 그대로 이어받는다")
	fun reusesIncoming() {
		mockMvc.perform(get("/stub/echo").header(RequestIdFilter.HEADER, "nginx-abc.123_x").with(user("tester")))
			.andExpect(status().isOk)
			.andExpect(header().string(RequestIdFilter.HEADER, "nginx-abc.123_x"))
	}

	@Test
	@DisplayName("형식이 어긋난 식별자(공백·개행·과장)는 버리고 새로 만든다 — 로그 한 줄이 깨지지 않게")
	fun rejectsUnsafeIncoming() {
		val unsafe = "abc def"
		val result = mockMvc.perform(get("/stub/echo").header(RequestIdFilter.HEADER, unsafe).with(user("tester")))
			.andExpect(status().isOk)
			.andReturn()

		assertThat(result.response.getHeader(RequestIdFilter.HEADER)).isNotEqualTo(unsafe).isNotBlank()
	}

	@Test
	@DisplayName("에러 응답에도 헤더가 남는다 — 추적이 필요한 순간에 빠지면 의미가 없다")
	fun keepsHeaderOnError() {
		mockMvc.perform(get("/stub/boom").with(user("tester")))
			.andExpect(status().isInternalServerError)
			.andExpect(header().exists(RequestIdFilter.HEADER))
	}

	@Test
	@DisplayName("요청이 끝나면 MDC 를 비운다 — 풀 스레드가 다음 요청에 이전 식별자를 달지 않게")
	fun clearsMdcAfterRequest() {
		mockMvc.perform(get("/stub/echo").with(user("tester"))).andExpect(status().isOk)

		assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull()
	}

	@RestController
	class StubController {

		/** 컨트롤러 시점의 MDC 값을 그대로 돌려준다 — 헤더와 로그가 같은 값인지 확인하는 용도. */
		@GetMapping("/stub/echo")
		fun echo(): String? = MDC.get(RequestIdFilter.MDC_KEY)

		@GetMapping("/stub/boom")
		fun boom() {
			throw IllegalStateException("boom")
		}
	}
}
