/**
 * OAuth state 파라미터를 만들고 되돌아왔을 때 대조한다.
 *
 * 카카오로 이동하면 페이지가 언로드되므로 돌아왔을 때 변수도 스토어도 비어 있다.
 * 왕복하는 동안 살아남을 곳이 필요하고 그게 state 파라미터와 sessionStorage 다.
 * 담기는 것은 자격증명이 아니라 일회용 난수와 경로라 토큰 보관 규칙과 무관하다.
 *
 * state 가 하는 일은 둘이다.
 * 1. CSRF 방어 — 공격자의 인가 코드가 담긴 콜백 URL 을 피해자가 열면 공격자 계정으로
 *    로그인이 붙는다. 우리가 만든 난수와 대조해야 우리가 시작한 로그인임을 안다.
 * 2. 돌아갈 경로 운반.
 *
 * 읽기와 지우기를 나눠 둔 이유 — 합치면 읽는 쪽이 부수효과를 갖게 되어 렌더 중에
 * 부를 수 없고, 리렌더 한 번에 값이 사라져 교환 중인 화면이 실패로 뒤집힌다.
 */

const STORAGE_KEY = 'auth.pendingOauth';

export const DEFAULT_REDIRECT_TO = '/';

type PendingOauth = {
  state: string;
  redirectTo: string;
};

/**
 * `//evil.com` 은 프로토콜 상대 URL 이라 `/` 로 시작하는데도 바깥으로 나간다.
 * 브라우저가 역슬래시를 슬래시로 정규화하므로 `/\evil.com` 도 같이 막는다.
 */
function toSafeRedirectPath(candidate: string | null): string {
  if (candidate === null || !candidate.startsWith('/')) {
    return DEFAULT_REDIRECT_TO;
  }
  if (candidate[1] === '/' || candidate[1] === '\\') {
    return DEFAULT_REDIRECT_TO;
  }
  return candidate;
}

/**
 * crypto.randomUUID 는 보안 컨텍스트에서만 있다. 폰에서 `http://192.168.x.x:5173` 으로
 * 열면 없어서 로그인 버튼이 그 자리에서 터진다. getRandomValues 는 그 제약이 없다.
 */
function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
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
 * 저장에 실패해도(사생활 보호 모드 등) 요청은 보낸다. 대신 돌아왔을 때 대조에
 * 실패해 로그인이 거절된다 — 확인할 수 없는 콜백을 통과시키는 것보다 낫다.
 */
export function createOauthState(redirectTo: string | null): string {
  const state = createNonce();
  const pending: PendingOauth = {
    state,
    redirectTo: toSafeRedirectPath(redirectTo),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // 저장할 수 없는 환경이다. 실패는 콜백에서 드러난다.
  }

  return state;
}

/** 대조에 성공하면 돌아갈 경로, 아니면 null. 읽기만 한다. */
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

/** 대조 결과와 무관하게 버린다. 남기면 같은 난수로 두 번째 콜백이 통과한다. */
export function clearOauthState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 읽을 수 없었던 환경이면 지울 것도 없다.
  }
}
