package com.finch.domain.ledger.service

import com.finch.domain.ledger.dto.TransactionFilter
import com.finch.domain.ledger.dto.response.TransactionRes
import com.finch.domain.ledger.repository.LedgerEntryRepository
import com.finch.domain.ledger.repository.TransactionRow
import com.finch.global.apiPayload.CursorPage
import com.finch.global.util.Cursor
import com.finch.global.util.toKst
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 원장 조회 (apiSpec 8.2). 쓰기는 [LedgerService] 가 하고 이쪽은 읽기만 한다.
 *
 * `/transactions` 를 `portfolio` 가 아니라 `ledger` 에 둔 이유 — apiSpec 8장이 `/portfolio` 와 묶어
 * 두었지만 읽는 대상이 원장이다. 소유권을 API 장 번호보다 데이터 기준으로 정했다 (backConvention 2.6).
 */
@Service
class TransactionService(
	private val ledgerEntryRepository: LedgerEntryRepository,
) {

	/**
	 * 한 페이지를 읽는다.
	 *
	 * **`size + 1` 개를 요청해 `hasNext` 를 판정한다.** 별도 `COUNT` 쿼리를 두지 않은 이유는
	 * 그것이 매 페이지마다 전체를 세기 때문이다 — 원장은 지워지지 않으므로 행이 단조 증가하고,
	 * 스크롤 한 번에 전체 카운트를 n번 반복하는 형태가 된다. 여분 1행이면 같은 답을 낸다.
	 */
	@Transactional(readOnly = true)
	fun getTransactions(
		userId: Long,
		filter: TransactionFilter,
		cursor: String?,
		size: Int?,
	): CursorPage<TransactionRes> {
		val limit = CursorPage.resolveSize(size)
		val rows = ledgerEntryRepository.findPage(
			userId = userId,
			type = filter.name,
			cursorId = Cursor.decodeToExclusiveUpperBound(cursor),
			limit = limit + 1,
		)

		val hasNext = rows.size > limit
		val page = if (hasNext) rows.subList(0, limit) else rows

		return CursorPage(
			items = page.map(::toRes),
			// 마지막 페이지면 커서를 주지 않는다. 주면 클라이언트가 빈 페이지를 한 번 더 받아온다.
			nextCursor = if (hasNext) Cursor.encode(page.last().transactionId) else null,
			hasNext = hasNext,
		)
	}

	/**
	 * 체결 관련 필드 여섯이 전부 `null` 이다. `trade` 를 조인하지 않기 때문이고, 그 이유는
	 * [LedgerEntryRepository.findPage] 주석에 있다. 필드를 지우지 않고 `null` 로 두는 것은
	 * 응답 스키마가 apiSpec 8.2 의 11필드로 이미 고정이기 때문이다.
	 */
	private fun toRes(row: TransactionRow): TransactionRes = TransactionRes(
		transactionId = row.transactionId,
		type = row.type,
		occurredAt = row.occurredAt.toKst(),
		stockCode = null,
		stockName = null,
		price = null,
		quantity = null,
		amount = row.amount,
		realizedProfit = null,
		realizedProfitRate = null,
		paymentMethod = row.paymentMethod,
	)
}
