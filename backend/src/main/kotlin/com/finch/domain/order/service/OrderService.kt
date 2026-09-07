package com.finch.domain.order.service

import com.finch.domain.account.service.AccountService
import com.finch.domain.ledger.entity.LedgerType
import com.finch.domain.order.dto.request.OrderCreateReq
import com.finch.domain.order.dto.response.OrderAvailableRes
import com.finch.domain.order.dto.response.OrderRes
import com.finch.domain.order.entity.OrderSide
import com.finch.domain.order.entity.Trade
import com.finch.domain.order.exception.OrderErrorCode
import com.finch.domain.order.repository.TradeRepository
import com.finch.domain.portfolio.service.PortfolioService
import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.price.service.PriceService
import com.finch.domain.stock.entity.Stock
import com.finch.domain.stock.service.StockService
import com.finch.global.exception.CustomException
import com.finch.global.idempotency.Completion
import com.finch.global.idempotency.IdempotencyGuard
import com.finch.global.idempotency.IdempotentResponse
import com.finch.global.util.toKst
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 시장가 즉시 체결 (apiSpec 7장). MVP 는 접수와 체결이 나뉘지 않는다.
 *
 * **`@Transactional` 이 쓰기 경로에 없다.** 트랜잭션은 [IdempotencyGuard.execute] 가 열고
 * [create] 가 넘긴 블록이 그 안에서 돈다 (`DepositService` 와 같은 이유).
 *
 * **원장을 직접 쓰지 않는다.** `AccountService.post` 만 부른다 — 그래야 예수금과 원장이
 * 함께 움직인다 (backConvention 2.5).
 */
@Service
class OrderService(
	private val accountService: AccountService,
	private val portfolioService: PortfolioService,
	private val stockService: StockService,
	private val priceService: PriceService,
	private val tradeRepository: TradeRepository,
	private val idempotencyGuard: IdempotencyGuard,
) {

	/**
	 * `POST /orders` (apiSpec 7.1 · 7.2).
	 *
	 * 수량 검사를 **가드보다 먼저** 한다. 0 이하는 어떤 키로 와도 성립할 수 없어 예약 행을
	 * 만들 이유가 없다 (`DepositService.create` 와 같은 이유).
	 */
	fun create(
		userId: Long,
		idempotencyKey: String?,
		request: OrderCreateReq,
	): IdempotentResponse<OrderRes> {
		if (request.quantity <= 0) throw CustomException(OrderErrorCode.ORDER_QUANTITY_INVALID)

		return idempotencyGuard.execute(
			userId = userId,
			keyHeader = idempotencyKey,
			endpoint = ENDPOINT,
			request = request,
			responseType = OrderRes::class.java,
		) {
			// 여기서부터 가드의 트랜잭션 안이다. 아래가 apiSpec 7.2 의 순서 그대로다.
			requireMarketOpen()

			val stock = stockService.getOrThrow(request.stockCode)
			if (stock.suspended) throw CustomException(OrderErrorCode.ORDER_STOCK_SUSPENDED)

			val price = latestPrice(stock)
			val amount = request.quantity * price

			when (request.side) {
				OrderSide.BUY -> buy(userId, stock, request.quantity, price, amount)
				OrderSide.SELL -> sell(userId, stock, request.quantity, price, amount)
			}
		}
	}

	/**
	 * `GET /orders/available` (apiSpec 7.3). 주문 화면이 최대 수량을 그리는 데 쓴다.
	 *
	 * **여기 값으로 체결을 보장하지 않는다.** 조회와 체결 사이에 가격이 움직이거나 다른 주문이
	 * 끼어들 수 있어, 체결 직전에 다시 판정한다. 그래서 잠금 없이 읽는다.
	 */
	@Transactional(readOnly = true)
	fun getAvailable(userId: Long, stockCode: String): OrderAvailableRes {
		val stock = stockService.getOrThrow(stockCode)
		val price = priceOf(stock).currentPrice
		val balance = accountService.getBalance(userId)
		val accountId = accountService.getAccountId(userId)

		return OrderAvailableRes(
				stockCode = stock.stockCode,
			currentPrice = price,
			cashBalance = balance.cashBalance,
			// 시세가 없으면 0 이다. 살 수 있는 수량을 셀 근거가 없어서고, 전일 종가로 대신
			// 세면 화면이 살 수 있다고 말한 뒤 체결이 ORDER_PRICE_UNAVAILABLE 로 거절된다.
			maxBuyQuantity = if (price == null || price <= 0) 0 else balance.cashBalance / price,
			maxSellQuantity = portfolioService.getQuantity(accountId, stock.stockCode),
		)
	}

	private fun buy(userId: Long, stock: Stock, quantity: Long, price: Long, amount: Long): Completion<OrderRes> {
		// 잠금을 먼저 쥔다. 검사와 반영 사이에 다른 주문이 끼어들면 예수금이 음수가 된다.
		val balance = accountService.lockForPosting(userId)

		/*
		 * **apiSpec 7.2 는 이 자리에 ORDER_PRICE_CHANGED 를 적었지만 INSUFFICIENT_CASH 를 쓴다.**
		 * 요청 본문에 사용자가 보던 예상가가 없어서(apiSpec 7.1 — stockCode·side·quantity 뿐),
		 * 돈이 모자란 이유가 "가격이 올라서" 인지 "원래 부족해서" 인지 서버가 구분할 수 없다.
		 * 구분할 수 없는 것을 단정하면 "가격이 변동되어" 라는 틀린 안내가 나간다.
		 * 예상가를 요청에 실어 보내기로 계약이 바뀌면 그때 둘을 가른다 — contracts.md 에 올린다.
		 */
		if (balance.cashBalance < amount) throw CustomException(OrderErrorCode.ORDER_INSUFFICIENT_CASH)

		val posting = accountService.post(userId, LedgerType.BUY, cashDelta = -amount)
		portfolioService.applyBuy(posting.accountId, stock.stockCode, quantity, price)

		val trade = tradeRepository.save(
			Trade.buy(posting.ledgerEntryId, posting.accountId, stock.stockCode, quantity, price, posting.occurredAt),
		)
		return completion(
			trade.id!!, stock, OrderSide.BUY, quantity, price,
			posting.cashBalanceAfter, posting.occurredAt.toKst(), null, posting.ledgerEntryId,
		)
	}

	/**
	 * 매도.
	 *
	 * **원장을 먼저 쓰고 보유를 줄인다.** 보유 잠금에 필요한 `accountId` 를 `CashPosting` 이
	 * 주기 때문이다 (apiSpec 1.6 이 계좌 식별자를 응답에 싣지 않기로 해서 그 경로뿐이다).
	 * 수량이 모자라면 여기서 예외가 나고 **트랜잭션이 통째로 되돌아간다** — 예수금만 늘고
	 * 보유는 안 준 상태로 커밋될 수 없다.
	 */
	private fun sell(userId: Long, stock: Stock, quantity: Long, price: Long, amount: Long): Completion<OrderRes> {
		accountService.lockForPosting(userId)
		val posting = accountService.post(userId, LedgerType.SELL, cashDelta = amount)

		val result = portfolioService.applySell(posting.accountId, stock.stockCode, quantity, price)
			?: throw CustomException(OrderErrorCode.ORDER_INSUFFICIENT_QUANTITY)

		val trade = tradeRepository.save(
			Trade.sell(
				posting.ledgerEntryId, posting.accountId, stock.stockCode, quantity, price,
				result.avgBuyPriceBefore, result.realizedProfit, posting.occurredAt,
			),
		)
		return completion(
			trade.id!!, stock, OrderSide.SELL, quantity, price,
			posting.cashBalanceAfter, posting.occurredAt.toKst(), result.realizedProfit, posting.ledgerEntryId,
		)
	}

	/**
	 * 응답과 완료 표시를 함께 만든다.
	 *
	 * `ledgerEntryId` 를 실어야 하는 이유는 `Completion` 주석에 있다 — 멱등성 레코드의
	 * `ck_idempotency_completed` 가 "완료 = 원장에 행이 있다" 를 DB 사실로 만든다.
	 */
	@Suppress("LongParameterList")
	private fun completion(
		orderId: Long,
		stock: Stock,
		side: OrderSide,
		quantity: Long,
		price: Long,
		cashBalanceAfter: Long,
		executedAt: java.time.OffsetDateTime,
		realizedProfit: Long?,
		ledgerEntryId: Long,
	) = Completion(
		status = HttpStatus.CREATED.value(),
		ledgerEntryId = ledgerEntryId,
		body = OrderRes(
			orderId = orderId,
			stockCode = stock.stockCode,
			stockName = stock.stockName,
			side = side,
			quantity = quantity,
			executedPrice = price,
			executedAmount = quantity * price,
			executedAt = executedAt,
			cashBalanceAfter = cashBalanceAfter,
			realizedProfit = realizedProfit,
		),
	)

	/**
	 * 최신 수신 가격. **없거나 지연이면 주문을 막는다** (apiSpec 7.2 의 3번).
	 *
	 * `stale` 을 거절 사유로 쓰는 이유 — 지연된 값으로 체결하면 사용자가 화면에서 본 가격과
	 * 다른 가격에 사고팔게 된다. 표시는 마지막 값을 보여주는 게 낫지만(그래야 화면이 안 비므로)
	 * 체결은 다르다.
	 */
	private fun latestPrice(stock: Stock): Long {
		val price = priceOf(stock)
		if (price.stale || price.currentPrice == null || price.currentPrice <= 0) {
			throw CustomException(OrderErrorCode.ORDER_PRICE_UNAVAILABLE)
		}
		return price.currentPrice
	}

	private fun priceOf(stock: Stock): PriceRes =
		priceService.getAll(listOf(stock.stockCode), mapOf(stock.stockCode to stock.previousClose))
			.getValue(stock.stockCode)

	/**
	 * 거래 시간 09:00~15:30 KST (apiSpec 7.2 의 1번).
	 *
	 * **요일은 보지 않는다.** 계약이 시간만 적었고, 휴장일 달력은 우리에게 없다 —
	 * 없는 근거로 막으면 열려 있어야 할 날에 막힌다. 실장이 아니라 모의투자다.
	 */
	private fun requireMarketOpen() {
		val now = ZonedDateTime.now(KST).toLocalTime()
		if (now < OPEN || now > CLOSE) throw CustomException(OrderErrorCode.ORDER_MARKET_CLOSED)
	}

	companion object {
		private const val ENDPOINT = "POST /api/v1/orders"
		private val KST = ZoneId.of("Asia/Seoul")
		private val OPEN = LocalTime.of(9, 0)
		private val CLOSE = LocalTime.of(15, 30)
	}
}
