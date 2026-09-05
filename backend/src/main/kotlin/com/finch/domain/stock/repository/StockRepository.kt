package com.finch.domain.stock.repository

import com.finch.domain.stock.entity.Stock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

/**
 * `stock` 은 stock 소유다. 마스터는 고정 적재라 애플리케이션이 쓰지 않으므로
 * `save` 조차 노출하지 않는다 — 적재는 마이그레이션과 (나중에) 수집 배치의 일이다.
 */
interface StockRepository : Repository<Stock, String> {

	fun findByStockCode(stockCode: String): Stock?

	/** 상장폐지 종목은 세지 않는다. 시드가 실제로 적재됐는지 확인하는 데 쓴다. */
	fun countByIsActiveTrue(): Long

	/** 검색·목록에서 여러 종목의 전일 종가를 한 번에 읽는다. 종목 수만큼 왕복하지 않는다. */
	fun findByStockCodeIn(stockCodes: Collection<String>): List<Stock>

	/**
	 * 종목명 부분일치 또는 종목코드 앞자리 일치 (apiSpec 5.1). 상장폐지 종목은 뺀다.
	 *
	 * **JPQL 이 아니라 네이티브인 이유는 `ILIKE` 때문이다.** 종목명에 영문이 섞여 있어
	 * (`SK하이닉스`·`LG전자`) 대소문자를 구분하면 `sk` 로 못 찾는다. JPQL 에는 `ILIKE` 가 없고
	 * `upper(stock_name) LIKE ...` 로 우회하면 `ix_stock_name_trgm` 인덱스를 못 탄다 —
	 * 그 GIN 인덱스는 컬럼 원본에 걸려 있고, pg_trgm 은 `ILIKE` 를 그대로 지원한다.
	 *
	 * 코드는 앞자리 일치다. `005930` 을 찾는데 `593` 이 걸리면 검색이 쓸모없어진다.
	 *
	 * 정렬은 코드 정확일치 → 종목명 순이다. `005930` 을 입력한 사람이 원하는 건 그 종목 하나다.
	 */
	@Query(
		value = """
			SELECT * FROM stock
			WHERE is_active = true
			  AND (stock_name ILIKE '%' || :keyword || '%' OR stock_code LIKE :keyword || '%')
			ORDER BY (stock_code = :keyword) DESC, stock_name
			LIMIT :size
		""",
		nativeQuery = true,
	)
	fun search(@Param("keyword") keyword: String, @Param("size") size: Int): List<Stock>
}
