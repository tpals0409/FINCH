package com.finch.domain.price.client

import java.time.Duration

/** KIS 내부 연동 실패. 응답 본문과 토큰은 예외 메시지에 넣지 않는다. */
internal class KisApiException(
	val retryable: Boolean,
	val retryAfter: Duration? = null,
	status: Int? = null,
	code: String? = null,
	val responseBody: String? = null,
	cause: Throwable? = null,
) : RuntimeException("KIS API 실패 status=$status code=$code", cause)
