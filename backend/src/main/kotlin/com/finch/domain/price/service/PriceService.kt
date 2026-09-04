package com.finch.domain.price.service

import com.finch.domain.price.dto.response.PriceRes
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper
import java.time.Duration
import java.time.Instant

/**
 * 시세 캐시를 읽는 창구다. `price` 를 소유하므로 다른 도메인은 이 서비스를 거친다
 * (backConvention 2.4 규칙 3).
 *
 * ⚠️ **읽기 절반만 있다. 캐시를 채우는 KIS 수집 계층이 아직 없어서 지금은 항상 비어 있다.**
 * 가짜 구현이 아니라 진짜 읽기 경로이고, 빈 캐시를 읽은 결과가 apiSpec 5.4 의 "값 없음" 줄
 * (전부 `null`, `stale: true`)과 정확히 같기 때문에 계약을 어기지 않는다. 수집이 붙으면
 * 이 클래스는 그대로 두고 쓰는 쪽만 생긴다.
 *
 * 원장 DB 가 아니라 Redis 인 이유는 `RefreshTokenStore` 와 같다 — 시세는 만료가 곧 폐기라
 * TTL 로 끝나고, 조회가 잦은데 원장을 그 트래픽에 쓰지 않는다.
 */
@Service
class PriceService(
	private val redisTemplate: StringRedisTemplate,
	private val objectMapper: ObjectMapper,
	@param:Value("\${finch.price.stale-after}") private val staleAfter: Duration,
) {

	/**
	 * 여러 종목의 시세를 한 번에 읽는다. 단건도 이걸 쓴다 — 목록 화면이 종목 수만큼 Redis 를
	 * 왕복하면 관심 종목 50개에 50회가 된다.
	 *
	 * `previousClose` 는 호출자가 넘긴다. 전일 종가는 `stock` 소유라 이 서비스가 그 테이블을
	 * 읽으면 도메인 경계를 넘는다.
	 *
	 * 캐시에 없는 종목은 `PriceRes.empty()` 로 채워 **요청한 코드 전부를 돌려준다.** 빠뜨리면
	 * 호출자마다 "없으면 어떻게 할지"를 다시 정하게 된다.
	 */
	fun getAll(stockCodes: Collection<String>, previousCloses: Map<String, Long?>): Map<String, PriceRes> {
		if (stockCodes.isEmpty()) return emptyMap()

		val codes = stockCodes.distinct()
		val cached = redisTemplate.opsForValue().multiGet(codes.map(::key)).orEmpty()
		val now = Instant.now()

		return codes.mapIndexed { i, code ->
			val tick = cached.getOrNull(i)?.let { readTick(it) }
			code to when (tick) {
				null -> PriceRes.empty(code)
				else -> PriceRes.of(
					stockCode = code,
					tick = tick,
					previousClose = previousCloses[code],
					// 수신은 됐는데 오래된 경우다. 값은 그대로 두고 지연만 알린다 (apiSpec 5.4 표 가운데 줄).
					stale = Duration.between(tick.asOf.toInstant(), now) > staleAfter,
				)
			}
		}.toMap()
	}

	/**
	 * 깨진 캐시 한 줄이 목록 전체를 500 으로 만들지 않게 한다. 시세는 다음 수신에 덮이므로
	 * 못 읽은 항목은 "값 없음"으로 흘려보내는 편이 낫다.
	 */
	private fun readTick(raw: String): PriceTick? =
		runCatching { objectMapper.readValue(raw, PriceTick::class.java) }.getOrNull()

	private fun key(stockCode: String): String = KEY_PREFIX + stockCode

	companion object {
		private const val KEY_PREFIX = "price:"
	}
}
