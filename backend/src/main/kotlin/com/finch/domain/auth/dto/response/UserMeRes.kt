package com.finch.domain.auth.dto.response

import com.finch.domain.auth.entity.User
import java.time.OffsetDateTime
import java.time.ZoneId

/**
 * `GET /api/v1/users/me` 응답 본문 (apiSpec 2.4).
 *
 * **계좌 식별자를 내려보내지 않는다.** 투자 회차가 없어지면서 `currentRoundId` 도 함께 빠졌고
 * (GitLab 이슈 #27), 계좌는 사용자당 하나라 클라이언트가 식별자로 지목할 대상이 아니다.
 * 모든 계좌 관련 요청은 토큰의 사용자로 계좌를 찾는다 (apiSpec 1.6).
 */
data class UserMeRes(
	val userId: Long,
	val nickname: String,
	val profileImageUrl: String?,
	val joinedAt: OffsetDateTime,
) {

	companion object {

		/**
		 * apiSpec 1.1 은 모든 시각을 **KST 오프셋 포함** ISO 8601 로 정했다 (`2026-08-25T10:00:00+09:00`).
		 *
		 * `Instant` 를 그대로 내보내면 Jackson 이 `2026-08-25T01:00:00Z` 로 쓴다. ISO 8601 이긴 하지만
		 * 오프셋이 Z 라 계약과 다르고, 프론트가 날짜를 문자열 그대로 보여주는 자리에서 하루가 밀린다.
		 *
		 * 시각을 내려보내는 첫 엔드포인트라 여기서 변환한다. 두 번째가 생기면 이 상수는
		 * `global/` 의 공용 상수로 올려야 한다 — 도메인마다 각자 적으면 갈라진다.
		 */
		private val KST: ZoneId = ZoneId.of("Asia/Seoul")

		fun from(user: User): UserMeRes = UserMeRes(
			user.id!!,
			user.nickname,
			user.profileImageUrl,
			user.createdAt.atZone(KST).toOffsetDateTime(),
		)
	}
}
