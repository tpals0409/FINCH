package com.finch.global.apiPayload

/**
 * 커서 기반 목록 응답 (apiSpec 1.5). 모든 목록 조회가 이 모양을 쓴다.
 *
 * `nextCursor` 가 `null` 이면 마지막 페이지다. 커서는 **불투명 문자열**이므로 클라이언트는
 * 파싱·조작·해석하지 않고 받은 값을 그대로 되돌려 보낸다 — 인코딩 방식은 서버 구현 상세다.
 *
 * `hasNext` 를 따로 두는 이유 — `nextCursor != null` 로도 알 수 있지만, 프론트가 "더 있음" 을
 * 판단하려고 커서의 값을 들여다보게 만들면 불투명 약속이 깨진다.
 */
data class CursorPage<T>(
	val items: List<T>,
	val nextCursor: String?,
	val hasNext: Boolean,
) {

	companion object {

		/** 공개 API 의 `size` 기본값 (apiSpec 1.5). 내부 연동 API(`/internal/v1`)는 100 이다. */
		const val DEFAULT_SIZE = 30

		/** 공개·내부 공통 상한 (apiSpec 1.5). */
		const val MAX_SIZE = 100

		/**
		 * 범위를 벗어난 `size` 를 거부하지 않고 자른다.
		 *
		 * apiSpec 1.5 는 기본값과 최대값만 정하고 초과 시 동작을 정하지 않았다. 400 을 주면
		 * `size=200` 을 보낸 클라이언트가 목록을 아예 못 보는데, 그 요청의 의도("많이 주세요")는
		 * 100 으로 충분히 만족된다. 잘린 사실은 `items.size` 로 드러난다.
		 */
		fun resolveSize(size: Int?): Int = (size ?: DEFAULT_SIZE).coerceIn(1, MAX_SIZE)
	}
}
