package com.finch.domain.account.service

import com.finch.domain.account.dto.AccountBalance
import com.finch.domain.account.dto.CashPosting
import com.finch.domain.account.dto.response.AccountSummaryRes
import com.finch.domain.account.entity.Account
import com.finch.domain.account.repository.AccountRepository
import com.finch.domain.ledger.entity.LedgerType
import com.finch.domain.ledger.service.LedgerService
import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import com.finch.global.util.toKst
import java.time.Instant
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * **예수금과 원장이 함께 움직이는 유일한 자리다.**
 *
 * `ledger_entry.cash_balance_after` 와 `account.cash_balance` 는 항상 같아야 한다. 이 짝을
 * 호출자마다 맞추게 하면 어긋날 자리가 호출자 수만큼 생기므로, 짝을 [postTo] 하나에 가둔다.
 * `deposit`·`order` 는 [post] 만 부르고 `LedgerService` 를 직접 부르지 않는다 — 부르면 잔액을
 * 안 움직이고 원장만 쓸 수 있다.
 *
 * backConvention 2.5 의 "기록 주체" 는 그대로다. 무엇을 기록할지는 여전히 각 도메인이 결정하고,
 * 기계적인 짝맞춤만 이 서비스가 갖는다.
 */
@Service
class AccountService(
	private val accountRepository: AccountRepository,
	private val ledgerService: LedgerService,
) {

	/**
	 * 계좌가 없으면 만들고 `INITIAL_GRANT` 를 지급한다. 있으면 아무것도 하지 않는다.
	 *
	 * **최초 로그인만이 아니라 모든 로그인에서 부른다.** "이번 요청이 계정을 만들었는지"(`created`)를
	 * 조건으로 걸지 않는 이유가 둘이다.
	 *
	 * 1. **기존 사용자에게 계좌가 없다.** V2 가 카카오 로그인 검증 행을 보존했고, 그 사용자는
	 *    `created = false` 경로라 조건을 걸면 영원히 계좌를 못 받는다. `GET /account` 가 500 이 된다.
	 * 2. **계좌 생성이 실패한 사용자가 스스로 회복한다.** `users` INSERT 와 계좌 생성은 다른
	 *    트랜잭션이라(AuthService 주석) 사이에서 죽을 수 있다. 조건을 걸면 그 사용자는 영구히 계좌가 없다.
	 *
	 * 백필 마이그레이션을 따로 두지 않은 이유도 이것이다 — 같은 문제를 한 번 고치는 것과
	 * 계속 고치는 것 중 후자를 골랐다. 대가는 로그인마다 SELECT 한 번이다.
	 *
	 * **`DataIntegrityViolationException` 을 여기서 잡지 않는다.** 잡으면 트랜잭션이 rollback-only 로
	 * 표시돼 커밋에서 다시 실패한다. 동시 로그인 경합은 트랜잭션 밖(AuthService)에서 잡는다.
	 *
	 * `INITIAL_GRANT` 가 계정당 정확히 1건이라는 apiSpec 8.2 의 전제는 `uq_account_user` 가 지킨다.
	 */
	@Transactional
	fun openAccountIfAbsent(userId: Long) {
		if (accountRepository.findByUserId(userId) != null) return

		val account = accountRepository.save(Account.open(userId))
		postTo(account, LedgerType.INITIAL_GRANT, Account.INITIAL_GRANT_AMOUNT, Instant.now())
	}

	/**
	 * 계좌 행을 잠그고 현재 값을 읽는다. 잠금은 트랜잭션 끝까지 유지되므로, 이것을 읽어 판단한 뒤
	 * [post] 를 부르는 사이에 다른 요청이 끼어들 수 없다.
	 *
	 * 충전의 누적 한도 검사가 이 메서드를 쓴다 — 한도 정책은 `deposit` 의 것이고 잠금은 이쪽 것이라
	 * 검사와 반영을 원자적으로 묶으려면 잠금을 먼저 넘겨줘야 한다.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	fun lockForPosting(userId: Long): AccountBalance =
		lockedAccount(userId).let { AccountBalance(it.cashBalance, it.totalDepositedAmount) }

	/**
	 * 예수금을 옮기고 원장에 1행을 남긴다.
	 *
	 * `depositedDelta` 는 충전만 쓴다 — 초기 지급과 주문은 누적 충전액을 건드리지 않는다.
	 * 초기 지급이 이 값에 섞이면 `GET /deposits/limit` 의 `depositedAmount` 가
	 * `type=DEPOSIT` 내역 합계와 어긋난다 (apiSpec 8.2).
	 *
	 * `MANDATORY` 라 호출자가 트랜잭션을 열어야 한다. 열지 않으면 런타임에 터진다 —
	 * 잔액만 옮기고 원장은 못 쓴 상태로 커밋되는 것보다 낫다.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	fun post(
		userId: Long,
		type: LedgerType,
		cashDelta: Long,
		depositedDelta: Long = 0,
	): CashPosting {
		val account = lockedAccount(userId)
		if (depositedDelta != 0L) account.addDeposited(depositedDelta)
		return postTo(account, type, cashDelta, Instant.now())
	}

	/** `GET /account` (apiSpec 3.1). */
	@Transactional(readOnly = true)
	fun getSummary(userId: Long): AccountSummaryRes {
		val account = requireAccount(accountRepository.findByUserId(userId))

		// 평가금액은 Σ(보유 수량 × 현재가) 다. holding·price 도메인이 없어 아직 계산할 수 없고,
		// 0 을 넣는다. 보유가 없어서가 아니라 계산 근거가 없어서다 — AccountSummaryRes 주석 참고.
		val evaluationAmount = 0L

		return AccountSummaryRes(
			cashBalance = account.cashBalance,
			evaluationAmount = evaluationAmount,
			totalAsset = account.cashBalance + evaluationAmount,
			asOf = Instant.now().toKst(),
		)
	}

	/** 잠금 없이 읽는다. `GET /deposits/limit` 처럼 판단에 쓰지 않고 보여주기만 하는 자리용이다. */
	@Transactional(readOnly = true)
	fun getBalance(userId: Long): AccountBalance =
		requireAccount(accountRepository.findByUserId(userId))
			.let { AccountBalance(it.cashBalance, it.totalDepositedAmount) }

	/**
	 * 잔액 반영과 원장 기록을 한 곳에 묶는다. **이 메서드가 유일한 짝맞춤 지점이다.**
	 *
	 * `applyCashDelta` 의 반환값을 그대로 `cash_balance_after` 로 넘기므로 둘이 갈라질 수 없다.
	 * 잔액을 먼저 읽어 더한 값을 따로 계산해 넘기는 형태였다면 그 계산이 어긋날 자리가 된다.
	 */
	private fun postTo(
		account: Account,
		type: LedgerType,
		cashDelta: Long,
		occurredAt: Instant,
	): CashPosting {
		val cashBalanceAfter = account.applyCashDelta(cashDelta)
		val entry = ledgerService.record(account.id!!, type, cashDelta, cashBalanceAfter, occurredAt)

		return CashPosting(entry.id!!, cashBalanceAfter, occurredAt)
	}

	private fun lockedAccount(userId: Long): Account =
		requireAccount(accountRepository.findByUserIdForUpdate(userId))

	/**
	 * 계좌가 없는 것은 **불변식이 깨진 상태**다 — 모든 사용자는 로그인 시 계좌를 받는다
	 * ([openAccountIfAbsent]). 그래서 404 가 아니라 500 이다.
	 *
	 * apiSpec 11장에 `ACCOUNT_NOT_FOUND` 가 없는 것도 같은 이유다. 프론트가 분기할 상황이 아니라
	 * 서버가 고칠 상황이다. 404 를 주면 프론트가 "그런 리소스는 없다" 로 읽고 조용히 빈 화면을 그린다.
	 */
	private fun requireAccount(account: Account?): Account =
		account ?: throw CustomException(GeneralErrorCode.INTERNAL_ERROR)
}
