package com.finch.domain.portfolio.service

import com.finch.domain.portfolio.dto.SellResult
import com.finch.domain.portfolio.entity.Holding
import com.finch.domain.portfolio.repository.HoldingRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * 보유 종목을 소유한다 (`holding` 테이블). 다른 도메인은 이 서비스를 거친다
 * (backConvention 2.4 규칙 3).
 *
 * 쓰기 메서드가 `MANDATORY` 다. 호출자가 트랜잭션을 열어야 하고, 안 열면 런타임에 터진다 —
 * 예수금은 움직였는데 보유는 안 바뀐 상태로 커밋되는 것보다 낫다 (`AccountService.post` 와 같은 이유).
 */
@Service
class PortfolioService(
	private val holdingRepository: HoldingRepository,
) {

	/**
	 * 매수 반영. 없던 종목이면 행을 만든다.
	 *
	 * 잠금을 걸고 읽는 이유는 같은 종목을 동시에 사면 평단 계산이 서로를 덮어쓰기 때문이다.
	 * 행이 없을 때의 INSERT 경합은 `uq_holding_round_stock`(계좌·종목 유니크)이 막는다 —
	 * 두 번째가 제약 위반으로 실패하고, 그건 트랜잭션 전체를 되돌리므로 돈이 어긋나지 않는다.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	fun applyBuy(accountId: Long, stockCode: String, quantity: Long, price: Long) {
		val holding = holdingRepository.lockByAccountIdAndStockCode(accountId, stockCode)
			?: holdingRepository.save(Holding.of(accountId, stockCode))

		holding.buy(quantity, price)
	}

	/**
	 * 매도 반영. **보유가 없거나 수량이 모자라면 `null`** 이다 — 부르는 쪽이 자기 에러 코드로 바꾼다.
	 *
	 * 전량 매도해도 행을 지우지 않는다. 이유는 `Holding` 주석에 있다.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	fun applySell(accountId: Long, stockCode: String, quantity: Long, price: Long): SellResult? {
		val holding = holdingRepository.lockByAccountIdAndStockCode(accountId, stockCode)
			?: return null

		if (holding.quantity < quantity) return null

		val avgBefore = holding.avgBuyPrice
		return SellResult(holding.sell(quantity, price), avgBefore)
	}

	/**
	 * 보유 수량. 주문 화면의 "최대 매도 가능 수량" 에 쓴다 (apiSpec 7.3).
	 *
	 * 잠금 없이 읽는다 — 판단이 아니라 표시용이고, 실제 판정은 체결 직전에 다시 한다.
	 */
	@Transactional(readOnly = true)
	fun getQuantity(accountId: Long, stockCode: String): Long =
		holdingRepository.findByAccountIdAndStockCode(accountId, stockCode)?.quantity ?: 0
}
