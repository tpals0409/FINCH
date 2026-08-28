/**
 * 쿼리 키 팩토리 (컨벤션 §4).
 * 호출부에서 문자열 배열을 직접 만들지 않는다. 직접 만들면 무효화 시점에
 * 키가 한 글자 어긋나 캐시가 안 지워지는 사고가 난다.
 */
export const queryKeys = {
  health: {
    all: () => ['health'] as const,
    status: () => [...queryKeys.health.all(), 'status'] as const,
  },
  users: {
    all: () => ['users'] as const,
    /**
     * 내 정보. 키에 `userId` 를 넣지 않는다 — 식별자는 토큰에서만 나오고
     * 이 키가 가리키는 대상은 언제나 "지금 로그인한 사람"이다 (contracts C25).
     * 로그아웃 때 이 캐시를 비우는 것이 다음 로그인 사용자에게 남의 정보가
     * 잠깐 보이는 것을 막는다.
     */
    me: () => [...queryKeys.users.all(), 'me'] as const,
  },
} as const;
