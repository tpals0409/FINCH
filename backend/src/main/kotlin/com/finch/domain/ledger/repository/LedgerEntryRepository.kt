package com.finch.domain.ledger.repository

import com.finch.domain.ledger.entity.LedgerEntry
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

/**
 * `ledger_entry` 는 ledger 소유다. 다른 도메인은 이 리포지토리를 import 하지 않고
 * `AccountService.post` 를 거친다 (backConvention 2.2·2.5·규칙 3).
 *
 * **`JpaRepository` 를 상속하지 않는다.** 그쪽을 상속하면 `delete`·`deleteById`·`deleteAll`·
 * `deleteAllInBatch` 가 공짜로 붙어 원장 삭제 진입점이 생긴다. 원장 불변성(backConvention 6장)을
 * 주석으로 부탁하는 대신, 필요한 메서드만 선언하는 `Repository` 마커에서 시작해
 * **삭제·수정 메서드가 표면에 존재하지 않게** 만든다.
 *
 * 그래서 여기 없는 것이 곧 계약이다 — 이 파일에 `delete*` 나 `@Modifying` 을 추가하면
 * 그 자체가 규약 위반이고, 테스트가 그것을 고정한다.
 */
interface LedgerEntryRepository : Repository<LedgerEntry, Long> {

	fun save(entry: LedgerEntry): LedgerEntry

	/**
	 * 계좌의 원장 전체를 최신순으로. 불변식 검증(누적합 대조)과 `GET /transactions` 의
	 * 첫 페이지가 아닌 **전체 합계**가 필요한 자리에서 쓴다.
	 *
	 * 페이징 조회는 별도 쿼리다 — 여기에 커서를 섞으면 "전체" 와 "한 페이지" 가 같은 메서드가 된다.
	 */
	fun findAllByAccountIdOrderByIdDesc(accountId: Long): List<LedgerEntry>

	/**
	 * `GET /transactions` 의 한 페이지 (apiSpec 8.2). 최신순 고정, 커서는 `id` 기준이다.
	 *
	 * **`userId` 로 받아 `account` 를 조인한다.** ledger 는 1층이라 `AccountService`(2층)를 부를 수
	 * 없다 (backConvention 2.4 규칙 2). 규칙 4 가 조회 전용 조인을 열어 두었으므로 SQL 에서 잇는다.
	 *
	 * **`NULL` 파라미터를 쓰지 않는다.** `:type IS NULL OR ...` 형태면 Postgres 가 파라미터 타입을
	 * 못 정해 캐스팅을 요구하고, 커서도 같은 문제를 낸다. 대신 `type` 은 `'ALL'` 센티넬을 받고
	 * 커서는 없을 때 `Long.MAX_VALUE` 를 받아 **분기 자체를 없앴다** (Cursor 주석 참고).
	 *
	 * `abs(cash_delta)` 가 `amount` 다. 충전·초기 지급·매도는 양수 delta 이고 매수만 음수인데
	 * apiSpec 8.2 의 `amount` 는 넷 다 양수(체결 금액·충전 금액)이기 때문이다.
	 *
	 * `ponytail:` **`trade`·`stock` 을 조인하지 않는다.** `type=BUY|SELL` 은 이번 스프린트 범위 밖이고
	 * `trade` 가 0행이다. 0행에 대고 쓴 조인은 아무도 검증하지 못한 조인이라, 주문 스프린트가
	 * **실제 행을 가지고** 조인과 `realizedProfitRate`(소수 둘째 반올림)를 함께 붙인다. 그때
	 * `amount` 도 `abs(cash_delta)` 에서 `trade.executed_amount` 로 옮기는 편이 정확하다.
	 *
	 * 인덱스는 `ix_ledger_account_id_desc`(ALL)와 `ix_ledger_account_type_id`(필터)가 받는다.
	 */
	@Query(
		value = """
			SELECT l.id              AS "transactionId",
			       l.type            AS "type",
			       l.occurred_at     AS "occurredAt",
			       abs(l.cash_delta) AS "amount",
			       d.payment_method  AS "paymentMethod"
			  FROM ledger_entry l
			  JOIN account a ON a.id = l.account_id AND a.user_id = :userId
			  LEFT JOIN deposit d ON d.ledger_entry_id = l.id
			 WHERE (:type = 'ALL' OR l.type = :type)
			   AND l.id < :cursorId
			 ORDER BY l.id DESC
			 LIMIT :limit
		""",
		nativeQuery = true,
	)
	fun findPage(
		@Param("userId") userId: Long,
		@Param("type") type: String,
		@Param("cursorId") cursorId: Long,
		@Param("limit") limit: Int,
	): List<TransactionRow>
}
