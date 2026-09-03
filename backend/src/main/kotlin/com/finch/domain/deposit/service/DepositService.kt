package com.finch.domain.deposit.service

import com.finch.domain.account.service.AccountService
import com.finch.domain.deposit.dto.request.DepositCreateReq
import com.finch.domain.deposit.dto.response.DepositLimitRes
import com.finch.domain.deposit.dto.response.DepositRes
import com.finch.domain.deposit.entity.Deposit
import com.finch.domain.deposit.exception.DepositErrorCode
import com.finch.domain.deposit.repository.DepositRepository
import com.finch.domain.ledger.entity.LedgerType
import com.finch.global.exception.CustomException
import com.finch.global.idempotency.Completion
import com.finch.global.idempotency.IdempotencyGuard
import com.finch.global.idempotency.IdempotentResponse
import com.finch.global.util.toKst
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 모의 충전 (apiSpec 4장). deposit 은 4층이고 `account` 를 참조한다 (backConvention 2.4).
 *
 * **`@Transactional` 이 이 클래스의 쓰기 경로에 없다.** 트랜잭션은 [IdempotencyGuard.execute] 가
 * 열고, [create] 가 넘긴 블록이 그 안에서 돈다. 여기에도 붙이면 예약 INSERT 가 본 트랜잭션에
 * 딸려 들어가 `IDEMPOTENCY_IN_PROGRESS` 판정이 대기로 바뀐다.
 *
 * **원장을 직접 쓰지 않는다.** `AccountService.post` 만 부른다 — `LedgerService` 를 직접 부르면
 * 예수금을 안 움직이고 원장만 쓸 수 있다 (backConvention 2.5).
 */
@Service
class DepositService(
	private val accountService: AccountService,
	private val depositRepository: DepositRepository,
	private val idempotencyGuard: IdempotencyGuard,
) {

	/** `GET /deposits/limit` (apiSpec 4.1). 잠금 없이 읽는다 — 판단이 아니라 표시용이다. */
	@Transactional(readOnly = true)
	fun getLimit(userId: Long): DepositLimitRes {
		val deposited = accountService.getBalance(userId).totalDepositedAmount

		return DepositLimitRes(
			perRequestLimit = Deposit.PER_REQUEST_LIMIT,
			cumulativeLimit = Deposit.CUMULATIVE_LIMIT,
			depositedAmount = deposited,
			remainingAmount = Deposit.CUMULATIVE_LIMIT - deposited,
		)
	}

	/**
	 * `POST /deposits` (apiSpec 4.2).
	 *
	 * 1회 한도 검사를 **가드보다 먼저** 한다. 0원이나 1천만 원 초과는 어떤 키로 와도 성립할 수 없어
	 * 예약 행을 만들 이유가 없다 — 만들면 그 키가 실패 후 해제될 때까지 왕복 한 번을 더 쓴다.
	 * 헤더 누락과 금액 오류가 겹치면 금액 오류가 먼저 나가는데, 둘 다 400 이고 클라이언트가
	 * 고쳐야 하는 것도 둘 다이므로 순서가 동작을 바꾸지 않는다.
	 *
	 * 누적 한도는 **가드 안에서** 본다. 계좌 잠금을 쥔 뒤여야 검사와 반영 사이에 다른 충전이
	 * 끼어들지 않는다.
	 */
	fun create(
		userId: Long,
		idempotencyKey: String?,
		request: DepositCreateReq,
	): IdempotentResponse<DepositRes> {
		validateAmount(request.amount)

		return idempotencyGuard.execute(
			userId = userId,
			keyHeader = idempotencyKey,
			endpoint = ENDPOINT,
			request = request,
			responseType = DepositRes::class.java,
		) {
			// 여기서부터 가드의 트랜잭션 안이다. 잠금 → 한도 검사 → 반영이 한 덩어리다.
			val balance = accountService.lockForPosting(userId)
			val remaining = Deposit.CUMULATIVE_LIMIT - balance.totalDepositedAmount

			if (request.amount > remaining) {
				// 잔여 한도를 함께 싣는다. 화면이 "잔여 한도: N원" 을 그대로 그린다 (featureSpec 3.3).
				throw CustomException(
					DepositErrorCode.DEPOSIT_LIMIT_EXCEEDED,
					mapOf("remainingAmount" to remaining),
				)
			}

			val posting = accountService.post(
				userId = userId,
				type = LedgerType.DEPOSIT,
				cashDelta = request.amount,
				depositedDelta = request.amount,
			)
			val deposit = depositRepository.save(
				Deposit.of(
					ledgerEntryId = posting.ledgerEntryId,
					accountId = posting.accountId,
					amount = request.amount,
					paymentMethod = request.paymentMethod,
				)
			)

			Completion(
				status = HttpStatus.CREATED.value(),
				body = DepositRes(
					depositId = deposit.id!!,
					amount = request.amount,
					paymentMethod = request.paymentMethod,
					cashBalanceAfter = posting.cashBalanceAfter,
					depositedAt = posting.occurredAt.toKst(),
				),
				ledgerEntryId = posting.ledgerEntryId,
			)
		}
	}

	private fun validateAmount(amount: Long) {
		if (amount <= 0) throw CustomException(DepositErrorCode.DEPOSIT_AMOUNT_INVALID)
		if (amount > Deposit.PER_REQUEST_LIMIT) {
			throw CustomException(DepositErrorCode.DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED)
		}
	}

	companion object {
		/** `idempotency_record.endpoint` 에 그대로 들어간다. `VARCHAR(64)` 안이어야 한다. */
		private const val ENDPOINT = "POST /api/v1/deposits"
	}
}
