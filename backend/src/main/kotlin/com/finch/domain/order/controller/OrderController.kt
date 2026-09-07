package com.finch.domain.order.controller

import com.finch.domain.order.dto.request.OrderCreateReq
import com.finch.domain.order.dto.response.OrderAvailableRes
import com.finch.domain.order.dto.response.OrderRes
import com.finch.domain.order.service.OrderService
import com.finch.global.idempotency.IdempotencyGuard
import com.finch.global.security.LoginUser
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 주문 API (apiSpec 7장).
 *
 * **`Idempotency-Key` 가 필수다.** 체결은 되돌릴 수 없어서, 재시도가 두 번 사는 일을 막는 것이
 * 이 헤더의 존재 이유다. 프론트는 재시도에 **같은 키**를 쓴다 (apiSpec 1.4).
 */
@RestController
@RequestMapping("/api/v1/orders")
class OrderController(
	private val orderService: OrderService,
) {

	@PostMapping
	fun create(
		@LoginUser userId: Long,
		@RequestHeader(name = IdempotencyGuard.HEADER, required = false) idempotencyKey: String?,
		@RequestBody request: OrderCreateReq,
	): ResponseEntity<OrderRes> {
		val response = orderService.create(userId, idempotencyKey, request)

		return ResponseEntity.status(response.status).body(response.body)
	}

	@GetMapping("/available")
	fun available(
		@LoginUser userId: Long,
		@RequestParam stockCode: String,
	): OrderAvailableRes = orderService.getAvailable(userId, stockCode)
}
