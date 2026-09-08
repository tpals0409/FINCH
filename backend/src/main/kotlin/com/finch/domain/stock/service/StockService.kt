package com.finch.domain.stock.service

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.price.dto.response.PricesRes
import com.finch.domain.price.service.PriceService
import com.finch.domain.stock.dto.response.CandlesRes
import com.finch.domain.stock.dto.response.StockDetailRes
import com.finch.domain.stock.dto.response.StockSearchRes
import com.finch.domain.stock.entity.CandlePeriod
import com.finch.domain.stock.entity.Stock
import com.finch.domain.stock.exception.StockErrorCode
import com.finch.domain.stock.repository.DailyCandleRepository
import com.finch.domain.stock.repository.StockRepository
import com.finch.global.exception.CustomException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.ZoneId

/**
 * 종목 마스터를 읽는 창구다. `stock` 을 소유하므로 다른 도메인은 이 서비스를 거친다
 * (backConvention 2.4 규칙 3 — 다른 도메인의 Entity·Repository 를 import 하지 않는다).
 *
 * 마스터는 고정 적재라(apiSpec 5.1) 쓰기 경로가 없다. 조회만 노출한다.
 */
@Service
class StockService(
	private val stockRepository: StockRepository,
	private val dailyCandleRepository: DailyCandleRepository,
	private val priceService: PriceService,
	private val holdingReader: StockHoldingReader,
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

	/**
	 * 종목명·코드 검색 (apiSpec 5.1).
	 *
	 * 길이·범위 검증은 컨트롤러의 제약 어노테이션이 한다. 여기서 또 막으면 같은 규칙이 두 곳에
	 * 생겨 한쪽만 고치는 날이 온다.
	 */
	@Transactional(readOnly = true)
	fun search(keyword: String, size: Int): StockSearchRes {
		val stocks = stockRepository.search(keyword.trim(), size)
		return StockSearchRes.of(stocks, pricesOf(stocks))
	}

	/** 단건 현재가 (apiSpec 5.4). 종목은 있는데 수신값이 없으면 `PriceRes.empty` 가 성공 응답이다. */
	@Transactional(readOnly = true)
	fun getPrice(stockCode: String): PriceRes {
		val stock = getOrThrow(stockCode)
		return pricesOf(listOf(stock)).getValue(stockCode)
	}

	/**
	 * 다건 현재가 (apiSpec 5.5). 없는 코드는 전체 실패시키지 않고 제외한다.
	 *
	 * 저장소 반환 순서에 기대지 않고 요청 순서를 보존하며, 중복 요청 코드는 한 번만 내려준다.
	 */
	@Transactional(readOnly = true)
	fun getPrices(stockCodes: Collection<String>): PricesRes {
		if (stockCodes.isEmpty()) return PricesRes(emptyList())

		val requested = stockCodes.distinct()
		val stocksByCode = stockRepository.findByStockCodeIn(requested).associateBy { it.stockCode }
		val prices = pricesOf(stocksByCode.values.toList())
		return PricesRes(requested.mapNotNull { prices[it] })
	}

	/** 종목 상세 (apiSpec 5.2). `watched` 는 호출자가 넘긴다 — 근거는 `WatchlistService.isWatched`. */
	@Transactional(readOnly = true)
	fun getDetail(userId: Long, stockCode: String, watched: Boolean): StockDetailRes {
		val stock = getOrThrow(stockCode)
		val price = pricesOf(listOf(stock)).getValue(stockCode)
		return StockDetailRes.of(
			stock,
			price,
			watched,
			holdingReader.getHolding(userId, stockCode, price.currentPrice),
		)
	}

	/**
	 * 일봉 (apiSpec 5.3).
	 *
	 * 없는 종목이면 빈 배열이 아니라 404 다. 빈 배열은 "상장은 됐는데 일봉이 아직 없다" 는 뜻이라
	 * 오타로 없는 코드를 친 경우와 구분돼야 한다.
	 */
	@Transactional(readOnly = true)
	fun getCandles(stockCode: String, period: CandlePeriod): CandlesRes {
		getOrThrow(stockCode)
		val candles = dailyCandleRepository
			.findByIdStockCodeAndIdTradeDateGreaterThanEqualOrderByIdTradeDateAsc(
				stockCode,
				period.from(LocalDate.now(KST)),
			)
		return CandlesRes.of(stockCode, period, candles)
	}

	/**
	 * 코드 목록으로 종목 요약을 찾는다. 관심 종목·최근 본 종목처럼 **코드만 들고 있는 도메인**이
	 * 이름과 시세를 얻는 창구다 — 그쪽이 `Stock` 엔티티를 직접 읽으면 도메인 경계를 넘는다
	 * (backConvention 2.4 규칙 3).
	 *
	 * `StockSearchRes.Item` 을 그대로 돌려준다. 검색 결과 한 줄과 필요한 필드가 같아서
	 * (코드·이름·시장·시세·거래정지) 타입을 새로 만들면 같은 모양이 두 벌 생긴다.
	 *
	 * **없는 코드는 결과에서 빠진다.** 호출자가 그 코드를 목록에서 뺄지 남길지 스스로 정한다.
	 */
	@Transactional(readOnly = true)
	fun getSummaries(stockCodes: Collection<String>): Map<String, StockSearchRes.Item> {
		if (stockCodes.isEmpty()) return emptyMap()

		val stocks = stockRepository.findByStockCodeIn(stockCodes.distinct())
		return StockSearchRes.of(stocks, pricesOf(stocks)).items.associateBy { it.stockCode }
	}

	/** 전일 종가는 `stock` 이 갖고 있으므로 여기서 붙여 넘긴다 (`PriceService.getAll` 주석). */
	private fun pricesOf(stocks: List<Stock>): Map<String, PriceRes> =
		priceService.getAll(
			stocks.map { it.stockCode },
			stocks.associate { it.stockCode to it.previousClose },
		)

	companion object {
		/**
		 * 거래일 경계는 KST 다 (apiSpec 1.1). 컨테이너가 `TZ=Asia/Seoul` 이라 기본값도 같지만,
		 * 그 환경변수가 빠지는 순간 자정 근처에서 하루가 밀린다. 시각 계산은 주변 설정에 기대지 않는다.
		 */
		private val KST = ZoneId.of("Asia/Seoul")
	}
}
