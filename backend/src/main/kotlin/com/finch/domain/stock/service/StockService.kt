package com.finch.domain.stock.service

import com.finch.domain.stock.entity.Stock
import com.finch.domain.stock.exception.StockErrorCode
import com.finch.domain.stock.repository.StockRepository
import com.finch.global.exception.CustomException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 종목 마스터를 읽는 창구다. `stock` 을 소유하므로 다른 도메인은 이 서비스를 거친다
 * (backConvention 2.4 규칙 3 — 다른 도메인의 Entity·Repository 를 import 하지 않는다).
 *
 * 마스터는 고정 적재라(apiSpec 5.1) 쓰기 경로가 없다. 조회만 노출한다.
 */
@Service
class StockService(
	private val stockRepository: StockRepository,
) {

	/**
	 * 있으면 돌려주고 없으면 `STOCK_NOT_FOUND` 다.
	 *
	 * 관심 종목·주문처럼 `stockCode` 를 받는 도메인이 전부 이것을 쓴다 — 같은 상황에 도메인마다
	 * 다른 코드를 만들지 않는다 (`StockErrorCode` 주석).
	 *
	 * **상장폐지 종목도 돌려준다.** 검색에서만 제외하고(apiSpec 5.1) 상세·보유는 구분 필드조차
	 * 두지 않기로 했다(이슈 #19). 여기서 걸러내면 보유 종목이 폐지됐을 때 조회가 404 가 된다.
	 */
	@Transactional(readOnly = true)
	fun getOrThrow(stockCode: String): Stock =
		stockRepository.findByStockCode(stockCode)
			?: throw CustomException(StockErrorCode.STOCK_NOT_FOUND)
}
