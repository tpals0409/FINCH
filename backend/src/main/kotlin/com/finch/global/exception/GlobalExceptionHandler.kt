package com.finch.global.exception

import com.finch.global.apiPayload.ErrorResponse
import com.finch.global.apiPayload.code.BaseErrorCode
import com.finch.global.apiPayload.code.GeneralErrorCode
import org.slf4j.LoggerFactory
import org.springframework.http.HttpMethod
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException

/**
 * 에러 응답을 만드는 유일한 지점이다.
 * 컨트롤러에서 try-catch 로 응답을 조립하지 않는다 (backConvention 5장).
 */
@RestControllerAdvice
class GlobalExceptionHandler {

	@ExceptionHandler(CustomException::class)
	fun handleCustom(e: CustomException): ResponseEntity<ErrorResponse> = respond(e.errorCode, e.detail)

	/** AI 서버 에러는 코드·문구·상태를 그대로 통과시키고 requestId 를 보존한다 (apiSpec 10.3, 10.4). */
	@ExceptionHandler(AiRelayException::class)
	fun handleAiRelay(e: AiRelayException): ResponseEntity<ErrorResponse> =
		ResponseEntity.status(e.status)
			.body(ErrorResponse.ofAiRelay(e.code, e.message, e.detail, e.requestId))

	/** 검증 실패의 detail 은 {필드명: 사유} 맵이다 (apiSpec 1.3). */
	@ExceptionHandler(MethodArgumentNotValidException::class)
	fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<ErrorResponse> {
		// 값이 String? 인 이유 — getDefaultMessage() 는 null 일 수 있다. Java 의 LinkedHashMap 이
		// 조용히 null 을 담던 자리라 타입으로 드러내고 동작은 그대로 둔다.
		val fields = LinkedHashMap<String, String?>()
		for (error in e.bindingResult.fieldErrors) {
			fields.putIfAbsent(error.field, error.defaultMessage)
		}
		return respond(GeneralErrorCode.INVALID_REQUEST, fields)
	}

	/**
	 * 존재하는 경로에 허용되지 않은 메서드로 온 요청 (apiSpec 11장 공통, v0.3 추가).
	 * 이 핸들러가 없으면 Exception 핸들러로 떨어져 405 가 500 으로 둔갑한다.
	 * Allow 헤더는 HTTP 규격(RFC 9110 §15.5.6)이 405 응답에 요구하는 값이라 그대로 싣는다.
	 */
	@ExceptionHandler(HttpRequestMethodNotSupportedException::class)
	fun handleMethodNotSupported(e: HttpRequestMethodNotSupportedException): ResponseEntity<ErrorResponse> {
		val builder = ResponseEntity.status(GeneralErrorCode.METHOD_NOT_ALLOWED.status)
		val allowed: Set<HttpMethod>? = e.supportedHttpMethods
		if (!allowed.isNullOrEmpty()) {
			builder.allow(*allowed.toTypedArray())
		}
		return builder.body(ErrorResponse.of(GeneralErrorCode.METHOD_NOT_ALLOWED))
	}

	/** 본문을 받는 엔드포인트에 application/json 이 아닌 Content-Type 으로 온 요청 (apiSpec 11장 공통). */
	@ExceptionHandler(HttpMediaTypeNotSupportedException::class)
	fun handleMediaTypeNotSupported(e: HttpMediaTypeNotSupportedException): ResponseEntity<ErrorResponse> =
		respond(GeneralErrorCode.UNSUPPORTED_MEDIA_TYPE, null)

	/** 매핑되지 않은 경로. 정적 리소스 핸들러가 던지는 예외라 이름이 낯설지만 실체는 404 다. */
	@ExceptionHandler(NoResourceFoundException::class)
	fun handleNoResource(e: NoResourceFoundException): ResponseEntity<ErrorResponse> =
		respond(GeneralErrorCode.RESOURCE_NOT_FOUND, null)

	/**
	 * 본문을 JSON 으로 읽지 못한 경우. 파서 메시지에는 클래스명·필드 경로가 섞여 있어
	 * detail 로 내보내지 않는다 — message 는 사용자에게 그대로 노출된다 (apiSpec 1.3).
	 */
	@ExceptionHandler(HttpMessageNotReadableException::class)
	fun handleUnreadable(e: HttpMessageNotReadableException): ResponseEntity<ErrorResponse> =
		respond(GeneralErrorCode.INVALID_REQUEST, null)

	/** 필수 쿼리 파라미터 누락. detail 은 본문 검증과 같은 {이름: 사유} 모양이다. */
	@ExceptionHandler(MissingServletRequestParameterException::class)
	fun handleMissingParameter(e: MissingServletRequestParameterException): ResponseEntity<ErrorResponse> =
		respond(GeneralErrorCode.INVALID_REQUEST, mapOf(e.parameterName to "필수 값입니다"))

	/** 쿼리·경로 파라미터의 타입 불일치 (예: size=abc, period=2W 같은 enum 값 밖). */
	@ExceptionHandler(MethodArgumentTypeMismatchException::class)
	fun handleTypeMismatch(e: MethodArgumentTypeMismatchException): ResponseEntity<ErrorResponse> =
		respond(GeneralErrorCode.INVALID_REQUEST, mapOf(e.name to "형식이 올바르지 않습니다"))

	/**
	 * `@RequestParam`·`@PathVariable` 에 붙인 제약(`@Min` 등) 위반.
	 * 본문 검증(MethodArgumentNotValidException)과 달리 BindingResult 가 없어 결과를 직접 돌며
	 * 같은 {이름: 사유} 모양으로 맞춘다. 프론트가 두 경우를 구분할 이유가 없다.
	 */
	@ExceptionHandler(HandlerMethodValidationException::class)
	fun handleParameterValidation(e: HandlerMethodValidationException): ResponseEntity<ErrorResponse> {
		val fields = LinkedHashMap<String, String?>()
		for (result in e.parameterValidationResults) {
			val name = result.methodParameter.parameterName
			for (error in result.resolvableErrors) {
				fields.putIfAbsent(name ?: "parameter", error.defaultMessage)
			}
		}
		return respond(GeneralErrorCode.INVALID_REQUEST, fields)
	}

	/**
	 * 예상하지 못한 예외. 원본 메시지를 본문에 담지 않는다 —
	 * message 는 사용자에게 그대로 노출되는 값이라 내부 정보가 새면 안 된다 (apiSpec 1.3).
	 */
	@ExceptionHandler(Exception::class)
	fun handleUnexpected(e: Exception): ResponseEntity<ErrorResponse> {
		log.error("처리되지 않은 예외", e)
		return respond(GeneralErrorCode.INTERNAL_ERROR, null)
	}

	companion object {

		private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

		private fun respond(errorCode: BaseErrorCode, detail: Any?): ResponseEntity<ErrorResponse> =
			ResponseEntity.status(errorCode.status).body(ErrorResponse.of(errorCode, detail))
	}
}
