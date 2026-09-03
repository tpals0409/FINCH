package com.finch.domain.ledger.service

import com.finch.domain.ledger.entity.LedgerEntry
import com.finch.domain.ledger.entity.LedgerType
import com.finch.domain.ledger.repository.LedgerEntryRepository
import java.time.Instant
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * 원장에 쓰는 **유일한 경로**다 (backConvention 2.5).
 *
 * ledger 는 스스로 원장을 만들지 않는다 — 무엇을 기록할지는 `account`(INITIAL_GRANT)·
 * `deposit`(DEPOSIT)·`order`(BUY·SELL)가 결정하고, 이 서비스는 그 결정을 한 모양으로 적는다.
 *
 * **`MANDATORY` 인 이유** — 원장 기록은 예수금 반영과 같은 트랜잭션이어야 한다. 자기 트랜잭션을
 * 열 수 있게 두면(`REQUIRED`) 잔액을 안 옮긴 채 원장만 커밋되는 경로가 생기고, 그 순간
 * `cash_balance_after` 가 거짓이 된다. `MANDATORY` 는 트랜잭션 없이 부르면 **런타임에 터진다** —
 * 조용히 새지 않는 쪽을 골랐다.
 */
@Service
class LedgerService(
	private val ledgerEntryRepository: LedgerEntryRepository,
) {

	/**
	 * 원장 1행을 기록한다.
	 *
	 * `cashBalanceAfter` 를 계산하지 않고 **받는다.** 계산하려면 `account` 를 읽어야 하고,
	 * 그러면 1층인 ledger 가 2층을 참조한다 (backConvention 2.4 규칙 2). 잠금을 쥐고 잔액을
	 * 움직인 쪽이 그 결과를 넘겨주는 것이 맞다 — 그 자리는 `AccountService.post` 하나다.
	 *
	 * 음수 잔액은 여기서 막지 않는다. `ck_ledger_balance_after`·`ck_account_cash_balance` 가
	 * DB 에서 막고, 애플리케이션이 한 번 더 검사하면 방어선이 둘로 갈려 어긋날 수 있다.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	fun record(
		accountId: Long,
		type: LedgerType,
		cashDelta: Long,
		cashBalanceAfter: Long,
		occurredAt: Instant,
	): LedgerEntry =
		ledgerEntryRepository.save(
			LedgerEntry.of(accountId, type, cashDelta, cashBalanceAfter, occurredAt)
		)
}
