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
    /** 키에 userId 를 넣지 않는다. 가리키는 대상은 언제나 지금 로그인한 사람이다. */
    me: () => [...queryKeys.users.all(), 'me'] as const,
  },
} as const;
