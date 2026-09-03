package com.finch.global.util

import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import java.util.Base64

/**
 * 커서 인코딩 (apiSpec 1.5 의 "서버 구현 상세" 를 여기서 확정한다).
 *
 * **형식은 `{"id":123}` 의 Base64URL 이다.** 숫자만 인코딩하면 더 짧지만, 나중에 정렬 축이 둘인
 * 목록(보유 종목의 평가금액순 등)이 생기면 필드를 더할 수 없다 — 옛 커서와 새 커서를 구분할
 * 표식이 없어서 이전 커서가 조용히 잘못 페이징된다. JSON 은 그 자리를 열어 두고, 디버깅할 때
 * `base64 -d` 로 읽을 수 있다.
 *
 * 직접 문자열을 만들고 파싱한다. Jackson 을 쓰지 않는 이유는 형식이 필드 하나로 고정이고,
 * 이 자리에 ObjectMapper 를 주입하면 유틸이 빈이 되어야 한다.
 */
object Cursor {

	private const val PREFIX = "{\"id\":"
	private const val SUFFIX = "}"

	fun encode(id: Long): String =
		Base64.getUrlEncoder().withoutPadding().encodeToString("$PREFIX$id$SUFFIX".toByteArray())

	/**
	 * 커서를 "이 id 미만" 의 경계로 바꾼다. **커서가 없으면 `Long.MAX_VALUE` 다.**
	 *
	 * `null` 을 그대로 쿼리에 넘기지 않는 이유 — 네이티브 SQL 에서 `:cursorId IS NULL OR ...` 를
	 * 쓰면 Postgres 가 파라미터 타입을 못 정해 캐스팅을 요구한다. id 가 양수인 BIGINT 이므로
	 * 상한값을 경계로 주면 조건이 항상 참이 되고 분기 자체가 사라진다.
	 *
	 * 깨진 커서는 `INVALID_REQUEST` 다. 클라이언트가 값을 만들어 보낸 것이므로 400 이고,
	 * 조용히 첫 페이지를 주면 무한 스크롤이 처음으로 되돌아가는 버그가 된다.
	 */
	fun decodeToExclusiveUpperBound(cursor: String?): Long {
		if (cursor.isNullOrBlank()) return Long.MAX_VALUE

		return try {
			val decoded = String(Base64.getUrlDecoder().decode(cursor))
			require(decoded.startsWith(PREFIX) && decoded.endsWith(SUFFIX))
			decoded.removeSurrounding(PREFIX, SUFFIX).toLong()
		} catch (e: IllegalArgumentException) {
			throw CustomException(GeneralErrorCode.INVALID_REQUEST, mapOf("cursor" to "형식이 올바르지 않습니다"))
		}
	}
}
