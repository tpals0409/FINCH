package com.finch.domain.watchlist

import com.finch.TestcontainersConfiguration
import com.finch.domain.auth.entity.User
import com.finch.domain.auth.repository.UserRepository
import com.finch.domain.stock.exception.StockErrorCode
import com.finch.domain.watchlist.exception.WatchlistErrorCode
import com.finch.domain.watchlist.repository.WatchlistItemRepository
import com.finch.domain.watchlist.service.WatchlistService
import com.finch.global.exception.CustomException
import java.util.concurrent.atomic.AtomicLong
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import

/**
 * 관심 종목의 계약을 고정한다 (apiSpec 6.3 · 11.2).
 *
 * 실제 PostgreSQL 이 필요하다 — 중복 판정이 `uq_watchlist_user_stock` 이고 종목 존재 확인이
 * `V5` 시드 2,598행에 기대므로 임베디드 DB 로는 아무것도 검증되지 않는다.
 *
 * 테스트마다 다른 사용자를 만들어 격리한다.
 */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class WatchlistServiceTest {

	@Autowired private lateinit var watchlistService: WatchlistService
	@Autowired private lateinit var watchlistItemRepository: WatchlistItemRepository
	@Autowired private lateinit var userRepository: UserRepository

	@Test
	@DisplayName("담으면 watched 가 true 가 된다 — 종목 상세의 토글 초기 상태다")
	fun addsAndReflectsInWatched() {
		val userId = newUser()

		assertThat(watchlistService.isWatched(userId, SAMSUNG)).isFalse()
		watchlistService.add(userId, SAMSUNG)

		assertThat(watchlistService.isWatched(userId, SAMSUNG)).isTrue()
	}

	@Test
	@DisplayName("같은 종목을 두 번 담으면 WATCHLIST_ALREADY_EXISTS 다 — 판정은 DB 제약이다")
	fun rejectsDuplicate() {
		val userId = newUser()
		watchlistService.add(userId, SAMSUNG)

		assertThatThrownBy { watchlistService.add(userId, SAMSUNG) }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(WatchlistErrorCode.WATCHLIST_ALREADY_EXISTS)
		assertThat(watchlistItemRepository.countByUserId(userId)).isEqualTo(1)
	}

	@Test
	@DisplayName("없는 종목은 STOCK_NOT_FOUND 다 — FK 위반을 500 으로 흘리지 않는다")
	fun rejectsUnknownStock() {
		assertThatThrownBy { watchlistService.add(newUser(), "999999") }
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(StockErrorCode.STOCK_NOT_FOUND)
	}

	@Test
	@DisplayName("50개를 넘기면 WATCHLIST_LIMIT_EXCEEDED 다")
	fun rejectsOverLimit() {
		val userId = newUser()
		SAMPLE_CODES.take(WatchlistService.MAX_COUNT.toInt())
			.forEach { watchlistService.add(userId, it) }

		assertThatThrownBy {
			watchlistService.add(userId, SAMPLE_CODES[WatchlistService.MAX_COUNT.toInt()])
		}
			.isInstanceOf(CustomException::class.java)
			.extracting("errorCode")
			.isEqualTo(WatchlistErrorCode.WATCHLIST_LIMIT_EXCEEDED)
		assertThat(watchlistItemRepository.countByUserId(userId))
			.isEqualTo(WatchlistService.MAX_COUNT)
	}

	@Test
	@DisplayName("없는 대상을 빼도 성공한다 — 삭제는 멱등이다 (apiSpec 11.2)")
	fun removeIsIdempotent() {
		val userId = newUser()

		watchlistService.remove(userId, SAMSUNG)
		watchlistService.add(userId, SAMSUNG)
		watchlistService.remove(userId, SAMSUNG)
		watchlistService.remove(userId, SAMSUNG)

		assertThat(watchlistService.isWatched(userId, SAMSUNG)).isFalse()
	}

	@Test
	@DisplayName("남의 관심 종목은 보이지도 지워지지도 않는다 — 존재 여부가 정보다 (이슈 #23)")
	fun isolatedPerUser() {
		val mine = newUser()
		val other = newUser()
		watchlistService.add(other, SAMSUNG)

		assertThat(watchlistService.isWatched(mine, SAMSUNG)).isFalse()
		// 남의 것을 지목해도 구분 없이 성공하고, 실제로는 지워지지 않는다.
		watchlistService.remove(mine, SAMSUNG)

		assertThat(watchlistService.isWatched(other, SAMSUNG)).isTrue()
	}

	@Test
	@DisplayName("한도 상수가 apiSpec 의 50 과 같다")
	fun limitMatchesSpec() {
		assertThat(WatchlistService.MAX_COUNT).isEqualTo(50)
	}

	private fun newUser(): Long =
		userRepository.save(User.register(KAKAO_ID.incrementAndGet(), "관심", null)).id!!

	companion object {
		private const val SAMSUNG = "005930"
		private val KAKAO_ID = AtomicLong(800_000_000_000L)

		/** V5 시드에 실재하는 코드여야 FK 를 통과한다. 51개가 필요하다(한도 경계). */
		/**
		 * **V5 시드에서 뽑은 실재 코드다.** 손으로 지어내면 FK 를 통과하지 못한다 —
		 * 실제로 그렇게 짰다가 한도 테스트가 STOCK_NOT_FOUND 로 죽었다.
		 * 한도 경계를 넘기려면 51개가 필요하다.
		 */
		private val SAMPLE_CODES: List<String> =
			listOf(
				"000020", "000040", "000050", "000070", "000080", "000100", "000120",
				"000140", "000150", "000180", "000210", "000220", "000230", "000240",
				"000250", "000270", "000300", "000320", "000370", "000390", "000400",
				"000430", "000440", "000480", "000490", "000500", "000520", "000540",
				"000590", "000640", "000650", "000660", "000670", "000680", "000700",
				"000720", "000760", "000810", "000850", "000860", "000880", "000890",
				"000910", "000950", "000970", "000990", "001000", "001020", "001040",
				"001060", "001070",
			)
	}
}
