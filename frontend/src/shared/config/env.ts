/**
 * 환경변수 접근 지점. import.meta.env 를 다른 곳에서 직접 읽지 않는다.
 * 읽는 곳이 흩어지면 이름을 바꿀 때 빠뜨리는 자리가 생긴다.
 *
 * 예외는 개발 전용 코드를 잘라내는 import.meta.env.DEV 분기뿐이다. 번들러가
 * 상수로 치환해 죽은 코드를 지워야 하므로 쓰는 자리에 그대로 적는다.
 */

/**
 * 백엔드 오리진. 경로 접두(/api/v1)는 계약이라 여기가 아니라 apiContract.ts 가 갖고
 * HTTP 클라이언트가 붙인다. 비워 두면 같은 오리진으로 나가 vite 프록시를 탄다.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 카카오 인가 요청의 client_id. REST API 키를 넣는다. JavaScript 키가 아니다 —
 * 그쪽은 카카오 JS SDK 전용이고 우리는 SDK 없이 authorize 로 직접 이동한다.
 *
 * 번들에 그대로 노출되지만 비밀값이 아니다. 인가 코드를 토큰으로 바꾸는 단계에서
 * Client Secret 이 필요하고 그건 백엔드만 갖는다.
 * 발급 전이면 빈 문자열이고 로그인 버튼이 스스로 비활성화된다.
 */
export const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';

/**
 * 카카오 콘솔에 등록한 redirect URI. 등록값과 문자 단위로 같아야 하고 다르면
 * 인가 단계에서 막힌다(KOE006). 등록 제도가 있는 이유는 client_id 가 공개값이라,
 * 없으면 공격자가 redirect_uri 만 자기 서버로 바꿔 인가 코드를 가로챌 수 있어서다.
 *
 * 같은 값을 로그인 요청 본문에도 실어 보낸다(apiSpec §2.1). 카카오가 토큰 교환 때
 * 인가 시점의 값과 대조하므로 코드를 훔쳐도 짝이 맞지 않으면 토큰이 안 나온다.
 */
export const KAKAO_REDIRECT_URI =
  import.meta.env.VITE_KAKAO_REDIRECT_URI ??
  `${window.location.origin}/oauth/kakao`;
