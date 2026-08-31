import { readOauthRedirectTo } from './oauthState';

export type CallbackFailure =
  /** 카카오 인가 단계에서 끝났다. 동의 취소가 대부분이다. */
  | { kind: 'kakaoRejected'; isCancelled: boolean }
  /** 콜백 주소인데 code 가 없다. 주소를 직접 열었거나 잘린 링크다. */
  | { kind: 'missingCode' }
  /** 우리가 시작한 로그인이라고 확인할 수 없다. */
  | { kind: 'stateMismatch' }
  /** 교환 요청이 실패했다. 문구는 서버가 준 것을 그대로 쓴다 (contracts C10). */
  | { kind: 'exchangeFailed'; message: string };

export type CallbackPreflight =
  | { kind: 'ready'; authorizationCode: string; redirectTo: string }
  | { kind: 'failed'; failure: CallbackFailure };

/**
 * 교환을 시작할 수 있는지 URL 과 저장된 state 만 보고 판정한다.
 * 부수효과가 없어 렌더 중에 한 번 계산해 두고 쓸 수 있다.
 */
export function readCallbackPreflight(
  searchParams: URLSearchParams,
): CallbackPreflight {
  const kakaoError = searchParams.get('error');
  if (kakaoError !== null) {
    return {
      kind: 'failed',
      failure: {
        kind: 'kakaoRejected',
        isCancelled: kakaoError === 'access_denied',
      },
    };
  }

  const authorizationCode = searchParams.get('code');
  if (authorizationCode === null || authorizationCode === '') {
    return { kind: 'failed', failure: { kind: 'missingCode' } };
  }

  // 대조는 교환보다 먼저 한다. 확인되지 않은 코드는 서버로 보내지 않는다.
  const redirectTo = readOauthRedirectTo(searchParams.get('state'));
  if (redirectTo === null) {
    return { kind: 'failed', failure: { kind: 'stateMismatch' } };
  }

  return { kind: 'ready', authorizationCode, redirectTo };
}
