package com.finch.global.config

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import tools.jackson.databind.cfg.DateTimeFeature

/**
 * apiSpec 1.1 은 모든 시각을 **KST 오프셋 포함** ISO 8601 로 정했다. 그 약속을 역직렬화에도 건다.
 */
@Configuration(proxyBeanMethods = false)
class JacksonConfig {

	/**
	 * 오프셋이 붙은 시각을 읽을 때 UTC 로 옮기지 않는다.
	 *
	 * Jackson 기본값(켜짐)이면 `2026-09-04T07:51:15+09:00` 을 읽어 `2026-09-03T22:51:15Z` 로 바꾼다.
	 * 같은 순간이지만 **문자열이 다르고**, 프론트가 이 값을 그대로 화면에 띄우는 자리에서는
	 * 날짜가 하루 밀린다 (`UserMeRes` 주석이 경고한 그 자리다).
	 *
	 * **실제로 문제가 된 곳은 멱등성 재생이다.** 응답 본문을 JSONB 로 저장했다가 다시 읽는데,
	 * 최초 응답은 `+09:00` 로 나가고 재시도 응답만 `Z` 로 나갔다 — apiSpec 1.4 의 "최초 결과를
	 * 그대로 반환" 이 깨진다. `LedgerInvariantTest` 의 재생 테스트가 이것을 잡았다.
	 *
	 * 가드에만 별도 ObjectMapper 를 두지 않고 전역에 거는 이유 — 같은 뒤틀림이 **들어오는 요청에도**
	 * 적용된다. 지금은 시각을 받는 엔드포인트가 없지만, 생겼을 때 조용히 UTC 로 옮겨지면 돈이
	 * 움직이는 서비스에서 가장 찾기 어려운 종류의 오차가 된다. 규칙은 한 곳에 한 번만 건다.
	 *
	 * `spring.jackson.*` 프로퍼티로 못 하는 이유 — Jackson 3 에서 이 기능이 `DeserializationFeature`
	 * 에서 `DateTimeFeature` 로 옮겨졌고, Boot 4.1 의 `JacksonProperties` 에는 그 맵이 없다.
	 */
	@Bean
	fun keepIncomingOffsets(): JsonMapperBuilderCustomizer =
		JsonMapperBuilderCustomizer { builder ->
			builder.disable(DateTimeFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
		}
}
