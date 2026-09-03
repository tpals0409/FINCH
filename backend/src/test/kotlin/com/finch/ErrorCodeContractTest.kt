package com.finch

import com.finch.domain.ai.exception.AiErrorCode
import com.finch.domain.auth.exception.AuthErrorCode
import com.finch.domain.deposit.exception.DepositErrorCode
import com.finch.domain.order.exception.OrderErrorCode
import com.finch.domain.stock.exception.StockErrorCode
import com.finch.domain.watchlist.exception.WatchlistErrorCode
import com.finch.global.apiPayload.code.BaseErrorCode
import com.finch.global.apiPayload.code.GeneralErrorCode
import java.util.stream.Collectors
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

/**
 * 백엔드 enum 전체가 apiSpec 11장 목록과 정확히 일치하는지 고정한다.
 *
 * 프론트는 이 문자열로만 분기하고(apiSpec 1.3) 같은 목록을 자기 상수로 옮겨 두었다.
 * 코드 하나가 이름만 바뀌거나 상태가 달라지면 프론트 분기가 컴파일 에러 없이 조용히 죽는다.
 * 그래서 기대값을 여기 다시 적는다 — 명세를 고칠 때 이 표도 같이 고치는 것이 의도된 마찰이다.
 *
 * 새 도메인 enum 을 만들면 ALL_ENUMS 에 추가한다. 빠뜨리면 중복 검사에서 새지만 목록 검사는 통과하므로
 * 도메인 enum 을 추가하는 MR 은 이 파일도 함께 건드려야 한다.
 */
class ErrorCodeContractTest {

	@Test
	@DisplayName("enum 전체의 code·status 가 apiSpec 11장 목록과 정확히 일치한다 (빠진 것도 남는 것도 없다)")
	fun matchesSpecSection11() {
		val actual: Map<String, HttpStatus> = allCodes().stream()
			.collect(Collectors.toMap({ it.code }, { it.status }))

		assertThat(actual).containsExactlyInAnyOrderEntriesOf(SPEC_SECTION_11)
	}

	@Test
	@DisplayName("code 문자열은 enum 을 통틀어 유일하다")
	fun codesAreUniqueAcrossEnums() {
		val codes = allCodes().map { it.code }

		assertThat(codes).doesNotHaveDuplicates()
	}

	@Test
	@DisplayName("code 는 enum 이름과 같고 대문자 스네이크다")
	fun codeEqualsEnumName() {
		for (code in allCodes()) {
			assertThat(code.code).isEqualTo((code as Enum<*>).name).matches("[A-Z][A-Z0-9_]*")
		}
	}

	@Test
	@DisplayName("message 는 비어 있지 않다 — 프론트가 그대로 화면에 띄운다 (apiSpec 1.3)")
	fun messagesArePresent() {
		assertThat(allCodes()).extracting<String> { it.message }.allMatch { it != null && it.isNotBlank() }
	}

	@Test
	@DisplayName("도메인 enum 은 자기 도메인 접두사를 쓴다 (backConvention 3장 도메인_원인)")
	fun domainPrefixes() {
		assertPrefix(AuthErrorCode.entries, "AUTH_")
		assertPrefix(AiErrorCode.entries, "AI_")
		assertPrefix(DepositErrorCode.entries, "DEPOSIT_")
		assertPrefix(StockErrorCode.entries, "STOCK_")
		assertPrefix(WatchlistErrorCode.entries, "WATCHLIST_")
		assertPrefix(OrderErrorCode.entries, "ORDER_")
	}

	private fun assertPrefix(values: List<BaseErrorCode>, prefix: String) {
		assertThat(values.map { it.code }).allMatch { it.startsWith(prefix) }
	}

	companion object {

		private val ALL_ENUMS: List<List<BaseErrorCode>> = listOf(
			GeneralErrorCode.entries,
			AuthErrorCode.entries,
			AiErrorCode.entries,
			DepositErrorCode.entries,
			StockErrorCode.entries,
			WatchlistErrorCode.entries,
			OrderErrorCode.entries,
		)

		/** apiSpec 11장을 그대로 옮긴 표. 순서·묶음도 문서와 같다. */
		private val SPEC_SECTION_11: Map<String, HttpStatus> = mapOf(
			// 인증
			"AUTH_KAKAO_FAILED" to HttpStatus.UNAUTHORIZED,
			"AUTH_REFRESH_TOKEN_MISSING" to HttpStatus.UNAUTHORIZED,
			"AUTH_INVALID_TOKEN" to HttpStatus.UNAUTHORIZED,
			"AUTH_TOKEN_EXPIRED" to HttpStatus.UNAUTHORIZED,
			"AUTH_FORBIDDEN" to HttpStatus.FORBIDDEN,
			// 공통
			"INVALID_REQUEST" to HttpStatus.BAD_REQUEST,
			"RESOURCE_NOT_FOUND" to HttpStatus.NOT_FOUND,
			"IDEMPOTENCY_KEY_REQUIRED" to HttpStatus.BAD_REQUEST,
			"IDEMPOTENCY_IN_PROGRESS" to HttpStatus.CONFLICT,
			"IDEMPOTENCY_CONFLICT" to HttpStatus.CONFLICT,
			"METHOD_NOT_ALLOWED" to HttpStatus.METHOD_NOT_ALLOWED,
			"UNSUPPORTED_MEDIA_TYPE" to HttpStatus.UNSUPPORTED_MEDIA_TYPE,
			"INTERNAL_ERROR" to HttpStatus.INTERNAL_SERVER_ERROR,
			// AI 중계 (백엔드 발행분)
			"AI_UPSTREAM_UNAVAILABLE" to HttpStatus.BAD_GATEWAY,
			"AI_UPSTREAM_TIMEOUT" to HttpStatus.GATEWAY_TIMEOUT,
			// 충전
			"DEPOSIT_AMOUNT_INVALID" to HttpStatus.BAD_REQUEST,
			"DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED" to HttpStatus.CONFLICT,
			"DEPOSIT_LIMIT_EXCEEDED" to HttpStatus.CONFLICT,
			// 종목 · 관심 종목
			"STOCK_NOT_FOUND" to HttpStatus.NOT_FOUND,
			"WATCHLIST_LIMIT_EXCEEDED" to HttpStatus.CONFLICT,
			"WATCHLIST_ALREADY_EXISTS" to HttpStatus.CONFLICT,
			// 주문
			"ORDER_QUANTITY_INVALID" to HttpStatus.BAD_REQUEST,
			"ORDER_MARKET_CLOSED" to HttpStatus.CONFLICT,
			"ORDER_STOCK_SUSPENDED" to HttpStatus.CONFLICT,
			"ORDER_PRICE_CHANGED" to HttpStatus.CONFLICT,
			"ORDER_INSUFFICIENT_CASH" to HttpStatus.CONFLICT,
			"ORDER_INSUFFICIENT_QUANTITY" to HttpStatus.CONFLICT,
			"ORDER_PRICE_UNAVAILABLE" to HttpStatus.SERVICE_UNAVAILABLE,
		)

		private fun allCodes(): List<BaseErrorCode> = ALL_ENUMS.flatten()
	}
}
