package com.finch.domain.ledger

import com.finch.TestcontainersConfiguration
import com.finch.domain.account.entity.Account
import com.finch.domain.account.repository.AccountRepository
import com.finch.domain.account.service.AccountService
import com.finch.domain.auth.entity.User
import com.finch.domain.auth.repository.UserRepository
import com.finch.domain.deposit.dto.request.DepositCreateReq
import com.finch.domain.deposit.entity.Deposit
import com.finch.domain.deposit.entity.PaymentMethod
import com.finch.domain.deposit.exception.DepositErrorCode
import com.finch.domain.deposit.repository.DepositRepository
import com.finch.domain.deposit.service.DepositService
import com.finch.domain.ledger.dto.TransactionFilter
import com.finch.domain.ledger.entity.LedgerType
import com.finch.domain.ledger.repository.LedgerEntryRepository
import com.finch.domain.ledger.service.TransactionService
import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.jpa.repository.Modifying
import org.springframework.transaction.IllegalTransactionStateException
import org.springframework.transaction.support.TransactionTemplate

/**
 * 원장의 불변식을 고정한다. **기록 경로가 하나뿐인 지금이 이 테스트가 가장 싼 시점이다** —
 * 주문이 붙으면 기록 지점이 셋으로 늘어 같은 검증이 세 배가 된다.
 *
 * **클래스에 `@Transactional` 을 붙이지 않았다.** 멱등성 가드가 `REQUIRES_NEW` 로 예약을 독립
 * 커밋하는데, 테스트가 트랜잭션을 열어 두면 그 예약만 커밋되고 본 처리는 끝까지 미커밋으로 남아
 * 실제 동작과 다른 것을 검증하게 된다. 대신 **테스트마다 다른 사용자**를 만들어 격리한다.
 *
 * 실제 PostgreSQL 이 필요하다. CHECK 제약과 UNIQUE 가 방어선인 불변식이 여럿이라
 * 임베디드 DB 로는 검증되지 않는다.
 */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class LedgerInvariantTest {

	@Autowired private lateinit var accountService: AccountService
	@Autowired private lateinit var depositService: DepositService
	@Autowired private lateinit var transactionService: TransactionService
	@Autowired private lateinit var userRepository: UserRepository
	@Autowired private lateinit var accountRepository: AccountRepository
	@Autowired private lateinit var depositRepository: DepositRepository
	@Autowired private lateinit var ledgerEntryRepository: LedgerEntryRepository
	@Autowired private lateinit var transactionTemplate: TransactionTemplate

	// ---------------------------------------------------------------- 계좌 개설

	@Test
	@DisplayName("계좌 개설을 두 번 불러도 INITIAL_GRANT 는 1건이다 — 계정당 정확히 1건 (apiSpec 8.2)")
	fun grantsInitialCashExactlyOnce() {
		val userId = newUser()

		accountService.openAccountIfAbsent(userId)
		accountService.openAccountIfAbsent(userId)

		val entries = entriesOf(userId)
		assertThat(entries.filter { it.type == LedgerType.INITIAL_GRANT }).hasSize(1)
		assertThat(entries).hasSize(1)
		assertThat(balanceOf(userId)).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
	}

	@Test
	@DisplayName("초기 지급도 원장을 거친다 — 계좌를 0 으로 만든 뒤 넣으므로 첫 순간부터 합이 맞는다")
	fun initialGrantGoesThroughLedger() {
		val userId = openedAccount()

		val entry = entriesOf(userId).single()
		assertThat(entry.cashDelta).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
		assertThat(entry.cashBalanceAfter).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
	}

	// ---------------------------------------------------------------- 원장 ↔ 계좌 정합

	@Test
	@DisplayName("Σ cash_delta 가 계좌의 예수금과 같다 — 파생값이 원장에서 벗어나지 않는다")
	fun ledgerSumEqualsCashBalance() {
		val userId = openedAccount()
		deposit(userId, 1_000_000)
		deposit(userId, 250_000)

		assertThat(entriesOf(userId).sumOf { it.cashDelta }).isEqualTo(balanceOf(userId))
	}

	@Test
	@DisplayName("각 행의 cash_balance_after 가 그 시점까지의 누적합과 같다")
	fun balanceAfterMatchesRunningSum() {
		val userId = openedAccount()
		deposit(userId, 300_000)
		deposit(userId, 700_000)

		// 원장은 최신순으로 나오므로 뒤집어 시간순으로 훑는다.
		var running = 0L
		for (entry in entriesOf(userId).reversed()) {
			running += entry.cashDelta
			assertThat(entry.cashBalanceAfter).isEqualTo(running)
		}
		assertThat(running).isEqualTo(balanceOf(userId))
	}

	@Test
	@DisplayName("Σ deposit.amount 가 누적 충전액과 같고 한도 응답의 depositedAmount 와도 같다")
	fun depositSumMatchesCumulativeAndLimitResponse() {
		val userId = openedAccount()
		deposit(userId, 1_000_000)
		deposit(userId, 500_000)

		val accountId = accountRepository.findByUserId(userId)!!.id!!
		val limit = depositService.getLimit(userId)

		assertThat(depositRepository.sumAmountByAccountId(accountId)).isEqualTo(1_500_000)
		assertThat(limit.depositedAmount).isEqualTo(1_500_000)
		assertThat(limit.remainingAmount).isEqualTo(Deposit.CUMULATIVE_LIMIT - 1_500_000)
		// 초기 지급은 누적 충전액에 섞이지 않는다. 섞이면 예수금과 같은 값이 됐을 것이다.
		assertThat(limit.depositedAmount).isNotEqualTo(balanceOf(userId))
	}

	// ---------------------------------------------------------------- 한도

	@Test
	@DisplayName("0원 이하는 DEPOSIT_AMOUNT_INVALID 이고 원장을 건드리지 않는다")
	fun rejectsNonPositiveAmount() {
		val userId = openedAccount()

		assertThatThrownBy { deposit(userId, 0) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(DepositErrorCode.DEPOSIT_AMOUNT_INVALID)
		assertThat(entriesOf(userId)).hasSize(1)
	}

	@Test
	@DisplayName("1회 한도 초과는 DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED 다 — DB CHECK 보다 먼저 막는다")
	fun rejectsOverPerRequestLimit() {
		val userId = openedAccount()

		assertThatThrownBy { deposit(userId, Deposit.PER_REQUEST_LIMIT + 1) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(DepositErrorCode.DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED)
		assertThat(entriesOf(userId)).hasSize(1)
	}

	@Test
	@DisplayName("누적 한도 초과는 detail 에 잔여 한도를 싣는다 — 화면이 그 숫자를 그대로 그린다")
	fun rejectsOverCumulativeLimitWithRemaining() {
		val userId = openedAccount()
		// 1천만 × 10 = 1억. 마지막 한 건은 잔여 0 이라 거부돼야 한다.
		repeat(10) { deposit(userId, Deposit.PER_REQUEST_LIMIT) }

		assertThatThrownBy { deposit(userId, 1) }
			.isInstanceOf(CustomException::class.java)
			.extracting("detail")
			.isEqualTo(mapOf("remainingAmount" to 0L))
		assertThat(depositService.getLimit(userId).depositedAmount).isEqualTo(Deposit.CUMULATIVE_LIMIT)
	}

	@Test
	@DisplayName("예수금이 음수가 되는 기록은 DB 가 막는다 — 애플리케이션에 같은 검사를 두지 않았다")
	fun databaseRejectsNegativeBalance() {
		val userId = openedAccount()

		assertThatThrownBy {
			transactionTemplate.execute {
				accountService.post(userId, LedgerType.BUY, -(Account.INITIAL_GRANT_AMOUNT + 1))
			}
		}.isInstanceOf(DataIntegrityViolationException::class.java)

		assertThat(balanceOf(userId)).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
		assertThat(entriesOf(userId)).hasSize(1)
	}

	@Test
	@DisplayName("post 를 트랜잭션 없이 부르면 터진다 — MANDATORY 가 조용히 새는 것을 막는다")
	fun postRequiresTransaction() {
		val userId = openedAccount()

		assertThatThrownBy { accountService.post(userId, LedgerType.DEPOSIT, 1_000) }
			.isInstanceOf(IllegalTransactionStateException::class.java)
		assertThat(entriesOf(userId)).hasSize(1)
	}

	// ---------------------------------------------------------------- 멱등성

	@Test
	@DisplayName("같은 키로 두 번 충전하면 원장 행이 늘지 않고 최초 응답이 그대로 재생된다")
	fun replaysSameKeyWithoutNewLedgerRow() {
		val userId = openedAccount()
		val key = newKey()
		val request = DepositCreateReq(1_000_000, PaymentMethod.VIRTUAL_CARD)

		val first = depositService.create(userId, key, request)
		val second = depositService.create(userId, key, request)

		assertThat(second.status).isEqualTo(first.status)
		assertThat(second.body).isEqualTo(first.body)
		assertThat(entriesOf(userId)).hasSize(2)
		assertThat(balanceOf(userId)).isEqualTo(Account.INITIAL_GRANT_AMOUNT + 1_000_000)
	}

	@Test
	@DisplayName("같은 키에 다른 본문이면 IDEMPOTENCY_CONFLICT 이고 원장은 그대로다")
	fun rejectsSameKeyWithDifferentBody() {
		val userId = openedAccount()
		val key = newKey()
		depositService.create(userId, key, DepositCreateReq(1_000_000, PaymentMethod.VIRTUAL_CARD))

		assertThatThrownBy {
			depositService.create(userId, key, DepositCreateReq(2_000_000, PaymentMethod.VIRTUAL_CARD))
		}
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(GeneralErrorCode.IDEMPOTENCY_CONFLICT)
		assertThat(entriesOf(userId)).hasSize(2)
	}

	@Test
	@DisplayName("결제 수단만 달라도 다른 요청이다 — 해시가 본문 전체를 덮는다")
	fun paymentMethodIsPartOfTheHash() {
		val userId = openedAccount()
		val key = newKey()
		depositService.create(userId, key, DepositCreateReq(1_000_000, PaymentMethod.VIRTUAL_CARD))

		assertThatThrownBy {
			depositService.create(userId, key, DepositCreateReq(1_000_000, PaymentMethod.VIRTUAL_TRANSFER))
		}
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(GeneralErrorCode.IDEMPOTENCY_CONFLICT)
	}

	@Test
	@DisplayName("헤더가 없으면 IDEMPOTENCY_KEY_REQUIRED 다")
	fun requiresIdempotencyKey() {
		val userId = openedAccount()

		assertThatThrownBy {
			depositService.create(userId, null, DepositCreateReq(1_000, PaymentMethod.VIRTUAL_CARD))
		}
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(GeneralErrorCode.IDEMPOTENCY_KEY_REQUIRED)
	}

	@Test
	@DisplayName("처리가 실패한 키는 다시 쓸 수 있다 — 예약 행을 지우지 않으면 24시간 막힌다")
	fun releasesReservationWhenProcessingFails() {
		val userId = openedAccount()
		repeat(10) { deposit(userId, Deposit.PER_REQUEST_LIMIT) }
		val key = newKey()

		// 누적 한도를 넘어 가드 안에서 실패한다. 예약 행이 남으면 아래 재시도가 IN_PROGRESS 로 막힌다.
		assertThatThrownBy {
			depositService.create(userId, key, DepositCreateReq(1, PaymentMethod.VIRTUAL_CARD))
		}.isInstanceOf(CustomException::class.java)

		// 같은 키를 다시 쓴다. 이번엔 성립하는 요청이므로 통과해야 한다 (다른 사용자로 갈아타지 않는다).
		val other = openedAccount()
		val retried = depositService.create(other, key, DepositCreateReq(1_000, PaymentMethod.VIRTUAL_CARD))

		assertThat(retried.body.amount).isEqualTo(1_000)
	}

	// ---------------------------------------------------------------- 내역 조회

	@Test
	@DisplayName("type=DEPOSIT 합계가 depositedAmount 와 같다 — 초기 지급이 빠져 있다")
	fun depositFilterExcludesInitialGrant() {
		val userId = openedAccount()
		deposit(userId, 1_000_000)
		deposit(userId, 400_000)

		val deposits = allPages(userId, TransactionFilter.DEPOSIT)

		assertThat(deposits).hasSize(2)
		assertThat(deposits.sumOf { it.amount })
			.isEqualTo(depositService.getLimit(userId).depositedAmount)
		assertThat(deposits.map { it.type }).containsOnly("DEPOSIT")
		// 충전 건은 결제 수단을 갖는다. 조인이 실제로 붙는지 여기서 드러난다.
		assertThat(deposits.map { it.paymentMethod }).containsOnly("VIRTUAL_CARD")
	}

	@Test
	@DisplayName("INITIAL_GRANT 는 ALL 의 맨 끝에서만 보인다 — 어느 필터에도 없는 행이 아니다")
	fun initialGrantAppearsOnlyInAll() {
		val userId = openedAccount()
		deposit(userId, 1_000_000)

		val all = allPages(userId, TransactionFilter.ALL)

		assertThat(all.map { it.type }).containsExactly("DEPOSIT", "INITIAL_GRANT")
		assertThat(all.last().amount).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
		assertThat(all.last().paymentMethod).isNull()
		assertThat(allPages(userId, TransactionFilter.BUY)).isEmpty()
		assertThat(allPages(userId, TransactionFilter.SELL)).isEmpty()
	}

	@Test
	@DisplayName("커서 페이징이 행을 빠뜨리지도 겹치지도 않는다 — size 경계를 걸쳐서 확인한다")
	fun cursorPagingCoversEveryRowExactlyOnce() {
		val userId = openedAccount()
		repeat(7) { deposit(userId, 1_000) }
		val expected = entriesOf(userId).map { it.id }

		// 8행을 size 3 으로 나누면 3·3·2 다. 마지막 페이지가 꽉 차지 않는 경우를 포함한다.
		val walked = allPages(userId, TransactionFilter.ALL, size = 3).map { it.transactionId }

		assertThat(walked).containsExactlyElementsOf(expected)
		assertThat(walked).doesNotHaveDuplicates()
	}

	@Test
	@DisplayName("마지막 페이지는 nextCursor 가 null 이다 — 있으면 빈 페이지를 한 번 더 받아온다")
	fun lastPageHasNoCursor() {
		val userId = openedAccount()
		deposit(userId, 1_000)

		val page = transactionService.getTransactions(userId, TransactionFilter.ALL, null, 30)

		assertThat(page.hasNext).isFalse()
		assertThat(page.nextCursor).isNull()
		assertThat(page.items).hasSize(2)
	}

	@Test
	@DisplayName("깨진 커서는 INVALID_REQUEST 다 — 조용히 첫 페이지를 주면 스크롤이 되돌아간다")
	fun rejectsMalformedCursor() {
		val userId = openedAccount()

		assertThatThrownBy {
			transactionService.getTransactions(userId, TransactionFilter.ALL, "not-a-cursor", 30)
		}
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(GeneralErrorCode.INVALID_REQUEST)
	}

	@Test
	@DisplayName("size 는 상한에서 잘리고 아래로도 1 미만이 되지 않는다")
	fun clampsPageSize() {
		val userId = openedAccount()
		repeat(3) { deposit(userId, 1_000) }

		assertThat(transactionService.getTransactions(userId, TransactionFilter.ALL, null, 1000).items)
			.hasSize(4)
		assertThat(transactionService.getTransactions(userId, TransactionFilter.ALL, null, 0).items)
			.hasSize(1)
	}

	@Test
	@DisplayName("남의 원장은 보이지 않는다 — 조회가 토큰의 사용자로 계좌를 찾는다")
	fun doesNotLeakOtherUsersLedger() {
		val mine = openedAccount()
		val other = openedAccount()
		deposit(other, 5_000_000)

		val all = allPages(mine, TransactionFilter.ALL)

		assertThat(all).hasSize(1)
		assertThat(all.single().amount).isEqualTo(Account.INITIAL_GRANT_AMOUNT)
	}

	// ---------------------------------------------------------------- 계좌 요약

	@Test
	@DisplayName("총자산이 예수금과 같다 — 평가금액이 붙으면 이 테스트가 먼저 깨진다")
	fun totalAssetEqualsCashWhileEvaluationIsUnavailable() {
		val userId = openedAccount()
		deposit(userId, 2_000_000)

		val summary = accountService.getSummary(userId)

		assertThat(summary.cashBalance).isEqualTo(Account.INITIAL_GRANT_AMOUNT + 2_000_000)
		assertThat(summary.totalAsset).isEqualTo(summary.cashBalance)
		assertThat(summary.asOf).isNotNull()
	}

	// ---------------------------------------------------------------- 불변성

	@Test
	@DisplayName("원장 리포지토리에 삭제·수정 진입점이 없다 — JpaRepository 를 상속하지 않은 이유다")
	fun ledgerRepositoryExposesNoMutation() {
		val methods = LedgerEntryRepository::class.java.methods

		assertThat(methods.map { it.name })
			.noneMatch { it.startsWith("delete") || it.startsWith("remove") }
		assertThat(methods).noneMatch { it.isAnnotationPresent(Modifying::class.java) }
	}

	// ---------------------------------------------------------------- 헬퍼

	private fun newUser(): Long =
		userRepository.save(User.register(KAKAO_ID.incrementAndGet(), "불변식", null)).id!!

	private fun openedAccount(): Long = newUser().also { accountService.openAccountIfAbsent(it) }

	private fun deposit(userId: Long, amount: Long) {
		depositService.create(userId, newKey(), DepositCreateReq(amount, PaymentMethod.VIRTUAL_CARD))
	}

	private fun newKey(): String = UUID.randomUUID().toString()

	private fun balanceOf(userId: Long): Long = accountRepository.findByUserId(userId)!!.cashBalance

	private fun entriesOf(userId: Long) =
		ledgerEntryRepository.findAllByAccountIdOrderByIdDesc(
			accountRepository.findByUserId(userId)!!.id!!
		)

	/** 커서를 끝까지 따라가며 모든 행을 모은다. 페이징이 실제로 닫히는지도 여기서 드러난다. */
	private fun allPages(userId: Long, filter: TransactionFilter, size: Int = 30) = buildList {
		var cursor: String? = null
		do {
			val page = transactionService.getTransactions(userId, filter, cursor, size)
			addAll(page.items)
			cursor = page.nextCursor
		} while (page.hasNext)
	}

	companion object {
		/** `uq_users_kakao_id` 때문에 테스트마다 달라야 한다. 컨테이너가 클래스 간에 공유된다. */
		private val KAKAO_ID = AtomicLong(900_000_000_000L)
	}
}
