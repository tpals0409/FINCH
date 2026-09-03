package com.finch.domain.ledger.repository

import com.finch.domain.ledger.entity.LedgerEntry
import org.springframework.data.repository.Repository

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
}
