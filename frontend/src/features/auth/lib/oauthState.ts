/**
 * OAuth `state` 파라미터를 만들고 되돌아왔을 때 확인한다.
 *
 * 카카오로 이동하는 순간 우리 페이지는 통째로 언로드된다. 돌아왔을 때는 앱이 처음부터
 * 다시 부팅되므로 **자바스크립트 변수도 zustand 스토어도 전부 비어 있다.**
 * 그래서 왕복하는 동안 살아남을 곳이 필요하고, 그게 `state` 파라미터와 `sessionStorage` 다.
 *
 * `state` 가 하는 일은 두 가지다.
 *
 * 1. **CSRF 방어.** 공격자가 자기 인가 코드가 담긴 콜백 URL 을 피해자에게 열게 하면
 *    피해자 브라우저에 공격자 계정으로 로그인이 붙는다. 우리가 만든 난수와 대조하면
 *    "이 콜백은 이 브라우저가 시작한 로그인이 맞다"를 확인할 수 있다.
 * 2. **돌아갈 경로 운반.** 로그인 후 원래 가려던 곳으로 되돌리려면 그 경로가 왕복해야 한다.
 *
 * Access Token 을 스토리지에 두지 않는 규칙과 충돌하지 않는다. 여기 담기는 것은
 * 자격증명이 아니라 일회용 난수와 경로 문자열이고, 교환이 시작되면 즉시 지운다.
 *
 * **읽기(`readOauthRedirectTo`)와 지우기(`clearOauthState`)를 나눠 둔 이유가 있다.**
 * 합쳐 두면 읽는 쪽이 부수효과를 갖게 되어 렌더 중에 부를 수 없고, 리렌더 한 번에
 * 값이 사라져 교환 중인 화면이 "확인 실패"로 뒤집힌다.
 */

const STORAGE_KEY = 'auth.pendingOauth';

export const DEFAULT_REDIRECT_TO = '/';

type PendingOauth = {
  state: string;
  redirectTo: string;
};

/**
 * 외부 주소로 돌려보내지지 않게 막는다 (open redirect).
 * `//evil.com` 은 프로토콜 상대 URL 이라 `/` 로 시작하는데도 바깥으로 나간다.
 */
function toSafeRedirectPath(candidate: string | null): string {
  if (candidate === null || !candidate.startsWith('/')) {
    return DEFAULT_REDIRECT_TO;
  }
  if (candidate.startsWith('//')) {
    return DEFAULT_REDIRECT_TO;
  }
  return candidate;
}

function isPendingOauth(value: unknown): value is PendingOauth {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.state === 'string' &&
    typeof candidate.redirectTo === 'string'
  );
}

function readPendingOauth(): PendingOauth | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isPendingOauth(parsed) ? parsed : null;
}

/**
 * 난수를 만들어 저장하고 인가 URL 에 실을 값을 돌려준다.
 *
 * 저장에 실패해도(사생활 보호 모드 등) 인가 요청 자체는 보낸다. 대신 돌아왔을 때
 * 대조할 것이 없어 확인이 실패하고 로그인이 거절된다.
 * 확인할 수 없는 콜백을 통과시키는 것보다 로그인이 안 되는 쪽이 낫다.
 */
export function createOauthState(redirectTo: string | null): string {
  const state = crypto.randomUUID();
  const pending: PendingOauth = {
    state,
    redirectTo: toSafeRedirectPath(redirectTo),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // 저장할 수 없는 환경이다. 여기서 던지지 않는다 — 실패는 콜백에서 드러난다.
  }

  return state;
}

/**
 * 돌아온 `state` 를 저장분과 대조한다. 맞으면 돌아갈 경로를, 아니면 `null` 을 돌려준다.
 * **읽기만 한다.** 지우는 것은 `clearOauthState` 의 몫이다.
 */
export function readOauthRedirectTo(
  returnedState: string | null,
): string | null {
  if (returnedState === null) {
    return null;
  }

  const pending = readPendingOauth();
  if (pending === null || pending.state !== returnedState) {
    return null;
  }

  return pending.redirectTo;
}

/**
 * 저장분을 버린다. **대조 결과와 무관하게 한 번 쓰면 버린다.**
 * 남겨 두면 같은 난수로 두 번째 콜백이 통과한다.
 */
export function clearOauthState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 읽을 수 없었던 환경이면 지울 것도 없다.
  }
}
