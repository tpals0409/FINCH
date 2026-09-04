package com.finch.domain.stock

import com.finch.TestcontainersConfiguration
import com.finch.domain.stock.entity.Market
import com.finch.domain.stock.repository.StockRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.context.annotation.Import

/**
 * `V5__seed_stock_master.sql` 이 실제로 적재되는지, 그리고 `Stock` 매핑이 그 스키마와 맞는지 본다.
 *
 * 마이그레이션은 "돌았다" 와 "원하는 행이 들어갔다" 가 다르다. Flyway 가 성공해도 INSERT 가
 * 0행이면 아무도 모르고, 검색·상세·주문이 전부 빈 결과를 내는 형태로만 드러난다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration::class)
class StockMasterSeedTest {

	@Autowired
	private lateinit var stockRepository: StockRepository

	@Test
	@DisplayName("시드가 2,598종을 적재한다 — 행수가 줄면 검색이 조용히 빈 결과를 낸다")
	fun seedsWholeMaster() {
		assertThat(stockRepository.countByIsActiveTrue()).isEqualTo(2_598)
	}

	@Test
	@DisplayName("종목코드의 선행 0 이 보존된다 — 정수로 다뤘으면 5930 이 됐을 자리다")
	fun preservesLeadingZero() {
		val samsung = stockRepository.findByStockCode("005930")

		assertThat(samsung).isNotNull()
		assertThat(samsung!!.stockCode).isEqualTo("005930")
		assertThat(samsung.stockName).isEqualTo("삼성전자")
		assertThat(samsung.market).isEqualTo(Market.KOSPI)
	}

	@Test
	@DisplayName("CHAR(6) 패딩이 값에 섞이지 않는다 — 6자가 아니면 비교와 조인이 어긋난다")
	fun doesNotLeakCharPadding() {
		val stock = stockRepository.findByStockCode("000660")

		assertThat(stock).isNotNull()
		assertThat(stock!!.stockCode).hasSize(6)
		assertThat(stock.stockCode).doesNotContain(" ")
	}

	@Test
	@DisplayName("KOSDAQ 종목도 적재된다 — 시장 하나만 들어오는 사고를 막는다")
	fun seedsBothMarkets() {
		val kosdaq = stockRepository.findByStockCode("247540")

		assertThat(kosdaq).isNotNull()
		assertThat(kosdaq!!.market).isEqualTo(Market.KOSDAQ)
	}

	@Test
	@DisplayName("previous_close 는 32종만 채워져 있다 — 나머지는 등락률을 낼 수 없다")
	fun leavesPreviousCloseNullOutsideSample() {
		// AI price_daily 가 32종만 담아서다 (V5 머리말). KIS 수집이 붙으면 전종목으로 찬다.
		assertThat(stockRepository.findByStockCode("005930")!!.previousClose).isNotNull()
		assertThat(stockRepository.findByStockCode("000050")!!.previousClose).isNull()
	}
}
