package com.finch.domain.auth.dto.response

import com.finch.domain.auth.entity.User
import com.finch.global.util.toKst
import java.time.OffsetDateTime

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

		fun from(user: User): UserMeRes = UserMeRes(
			user.id!!,
			user.nickname,
			user.profileImageUrl,
			user.createdAt.toKst(),
		)
	}
}
