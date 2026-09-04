package com.finch.domain.stock.repository

import com.finch.domain.stock.entity.Stock
import org.springframework.data.repository.Repository

/**
 * `stock` 은 stock 소유다. 마스터는 고정 적재라 애플리케이션이 쓰지 않으므로
 * `save` 조차 노출하지 않는다 — 적재는 마이그레이션과 (나중에) 수집 배치의 일이다.
 */
interface StockRepository : Repository<Stock, String> {

	fun findByStockCode(stockCode: String): Stock?

	/** 상장폐지 종목은 세지 않는다. 시드가 실제로 적재됐는지 확인하는 데 쓴다. */
	fun countByIsActiveTrue(): Long
}
