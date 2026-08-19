/**
 * 환경변수 접근 지점. import.meta.env 를 다른 곳에서 직접 읽지 않는다.
 * 읽는 곳이 흩어지면 이름을 바꿀 때 빠뜨리는 자리가 생긴다.
 *
 * 예외는 개발 전용 코드를 잘라내는 `import.meta.env.DEV` 분기뿐이다.
 * 그쪽은 번들러가 상수로 치환해 죽은 코드를 제거해야 하므로
 * 이 파일을 거치지 않고 쓰는 자리에 그대로 적는다 (main.tsx, AppProviders.tsx).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
