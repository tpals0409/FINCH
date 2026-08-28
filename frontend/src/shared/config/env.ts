/**
 * 환경변수 접근 지점. import.meta.env 를 다른 곳에서 직접 읽지 않는다.
 * 읽는 곳이 흩어지면 이름을 바꿀 때 빠뜨리는 자리가 생긴다.
 *
 * 예외는 개발 전용 코드를 잘라내는 `import.meta.env.DEV` 분기뿐이다.
 * 그쪽은 번들러가 상수로 치환해 죽은 코드를 제거해야 하므로
 * 이 파일을 거치지 않고 쓰는 자리에 그대로 적는다 (main.tsx, AppProviders.tsx).
 */

/**
 * 백엔드 오리진. **경로 접두(`/api/v1`)는 여기 넣지 않는다** — 그쪽은 환경이 아니라
 * 계약이라 `shared/config/apiContract.ts` 의 `API_BASE_PATH` 가 갖고 있고
 * HTTP 클라이언트가 붙인다.
 *
 * 비워 두면 같은 오리진으로 나가 vite 프록시를 탄다.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * 카카오 인가 요청의 `client_id` 다. **REST API 키를 넣는다. JavaScript 키가 아니다.**
 *
 * 두 키가 나뉜 이유가 여기서 드러난다. JavaScript 키는 카카오 JS SDK 를 브라우저에서
 * 초기화할 때 쓰는 것이고, 우리는 SDK 없이 `kauth.kakao.com/oauth/authorize` 로
 * 직접 이동하는 방식이라 그쪽 통로에는 REST API 키가 붙는다.
 *
 * 이 값은 번들에 그대로 박혀 누구나 볼 수 있지만 비밀값이 아니다. 키만으로는 토큰을
 * 못 받는다 — 인가 코드를 토큰으로 바꾸는 단계에서 Client Secret 이 필요하고,
 * 그건 백엔드만 갖는다. 그래서 프론트가 코드를 받아 백엔드로 넘기는 구조인 것이다.
 *
 * 아직 발급 전이면 빈 문자열이다. 로그인 버튼이 이 값을 보고 스스로 비활성화한다.
 */
export const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY ?? '';

/**
 * 카카오 개발자 콘솔에 등록한 redirect URI.
 *
 * **콘솔 등록값과 문자 단위로 같아야 한다.** 슬래시 하나만 달라도 카카오가 인가 단계에서
 * 막는다(KOE006). 카카오가 이 값을 미리 등록시키는 이유는, 등록이 없으면 공격자가
 * 우리 `client_id` 로 인가 URL 을 만들고 `redirect_uri` 만 자기 서버로 바꿔서
 * 사용자의 인가 코드를 가로챌 수 있기 때문이다.
 *
 * 같은 값을 로그인 요청 본문에도 실어 보낸다(apiSpec §2.1). 카카오가 토큰 교환 때
 * 인가 때 쓴 값과 대조하기 때문이다 — 코드를 훔쳐도 등록된 URI 와 짝이 맞지 않으면
 * 토큰으로 바꿀 수 없다.
 *
 * 기본값은 지금 열려 있는 오리진 기준이라 로컬에서는 설정 없이도 맞는다.
 */
export const KAKAO_REDIRECT_URI =
  import.meta.env.VITE_KAKAO_REDIRECT_URI ??
  `${window.location.origin}/oauth/kakao`;
