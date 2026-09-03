package com.finch.domain.auth.dto.response

import com.finch.domain.auth.entity.User

/**
 * 로그인 응답에 실리는 사용자 (apiSpec 2.1).
 *
 * `profileImageUrl` 은 **null 일 수 있다.** 카카오의 프로필 사진은 선택 동의 항목이라
 * 사용자가 동의하지 않으면 값이 오지 않는다. 빈 문자열로 바꾸지 않는다 —
 * `<img src="">` 는 브라우저가 현재 페이지를 다시 요청하게 만들고, "없음" 과 "빈 URL" 을 구분하지 못하게 한다.
 */
data class AuthUserRes(
	val userId: Long,
	val nickname: String,
	val profileImageUrl: String?,
) {

	companion object {
		/** 저장된 사용자만 들어온다. id 가 nullable 인 것은 DB 가 채우기 때문이고 응답 계약은 그렇지 않다. */
		fun from(user: User): AuthUserRes = AuthUserRes(user.id!!, user.nickname, user.profileImageUrl)
	}
}
