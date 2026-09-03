package com.finch.domain.ledger.controller

import com.finch.domain.ledger.dto.TransactionFilter
import com.finch.domain.ledger.dto.response.TransactionRes
import com.finch.domain.ledger.service.TransactionService
import com.finch.global.apiPayload.CursorPage
import com.finch.global.security.LoginUser
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 매매 내역 API (apiSpec 8.2). 원장 기반 통합 내역이고 충전도 함께 조회된다.
 */
@RestController
@RequestMapping("/api/v1/transactions")
class TransactionController(
	private val transactionService: TransactionService,
) {

	/**
	 * `size` 를 `Int?` 로 받는 이유 — 기본값을 컨트롤러와 서비스 두 곳에 적으면 갈라진다.
	 * 상수는 `CursorPage` 에 한 벌만 있고 [CursorPage.resolveSize] 가 해석한다.
	 *
	 * 잘못된 `type` 값은 Spring 이 `MethodArgumentTypeMismatchException` 으로 막고
	 * `GlobalExceptionHandler` 가 `INVALID_REQUEST` 로 옮긴다.
	 */
	@GetMapping
	fun list(
		@LoginUser userId: Long,
		@RequestParam(defaultValue = "ALL") type: TransactionFilter,
		@RequestParam(required = false) cursor: String?,
		@RequestParam(required = false) size: Int?,
	): CursorPage<TransactionRes> = transactionService.getTransactions(userId, type, cursor, size)
}
