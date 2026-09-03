package com.finch.domain.deposit.controller

import com.finch.domain.deposit.dto.request.DepositCreateReq
import com.finch.domain.deposit.dto.response.DepositLimitRes
import com.finch.domain.deposit.dto.response.DepositRes
import com.finch.domain.deposit.service.DepositService
import com.finch.global.idempotency.IdempotencyGuard
import com.finch.global.security.LoginUser
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 모의 결제 API (apiSpec 4장). **충전 취소 API 는 제공하지 않는다** (featureSpec 1.1·3.2).
 */
@RestController
@RequestMapping("/api/v1/deposits")
class DepositController(
	private val depositService: DepositService,
) {

	@GetMapping("/limit")
	fun limit(@LoginUser userId: Long): DepositLimitRes = depositService.getLimit(userId)

	/**
	 * `required = false` 로 받아 서비스가 판정한다. `true` 로 두면 Spring 이 먼저
	 * `MissingRequestHeaderException` 을 던지고 그것은 `INVALID_REQUEST` 로 매핑되는데,
	 * apiSpec 1.4 는 헤더 누락에 `IDEMPOTENCY_KEY_REQUIRED` 를 요구한다.
	 *
	 * 상태 코드를 `@ResponseStatus` 로 고정하지 않는다. 재생 시 **최초와 같은 상태 코드**여야 하고
	 * (apiSpec 1.4) 그 값은 저장된 레코드에서 나온다.
	 */
	@PostMapping
	fun create(
		@LoginUser userId: Long,
		@RequestHeader(name = IdempotencyGuard.HEADER, required = false) idempotencyKey: String?,
		@RequestBody request: DepositCreateReq,
	): ResponseEntity<DepositRes> {
		val response = depositService.create(userId, idempotencyKey, request)

		return ResponseEntity.status(response.status).body(response.body)
	}
}
