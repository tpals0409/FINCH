package com.finch.global.exception

import com.finch.global.apiPayload.code.BaseErrorCode

/** 백엔드가 스스로 판단한 실패. 서비스 계층에서 던지면 GlobalExceptionHandler 가 응답 형식을 맞춘다. */
class CustomException(
	val errorCode: BaseErrorCode,
	val detail: Any? = null,
) : RuntimeException(errorCode.message)
