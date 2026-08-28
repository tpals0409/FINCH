import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import { KAKAO_REDIRECT_URI } from '@/shared/config/env';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useKakaoLogin } from '../api/useKakaoLogin';
import { clearOauthState, readOauthRedirectTo } from '../lib/oauthState';

type CallbackFailure =
  /** 카카오 인가 단계에서 끝났다. 동의 취소가 대부분이다. */
  | { kind: 'kakaoRejected'; isCancelled: boolean }
  /** 콜백 주소인데 `code` 가 없다. 주소를 직접 열었거나 잘린 링크다. */
  | { kind: 'missingCode' }
  /** 우리가 시작한 로그인이라고 확인할 수 없다. */
  | { kind: 'stateMismatch' }
  /** 교환 요청이 실패했다. 문구는 서버가 준 것을 그대로 쓴다 (contracts C10). */
  | { kind: 'exchangeFailed'; message: string };

/**
 * 교환을 시작할 수 있는지 URL 과 저장된 `state` 만 보고 판정한 결과.
 * 여기까지는 네트워크가 필요 없다.
 */
type Preflight =
  | { kind: 'ready'; authorizationCode: string; redirectTo: string }
  | { kind: 'failed'; failure: CallbackFailure };

/** 부수효과가 없다. 그래서 렌더 중에 한 번 계산해 두고 쓸 수 있다. */
function readPreflight(searchParams: URLSearchParams): Preflight {
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

function describeFailure(failure: CallbackFailure): string {
  switch (failure.kind) {
    case 'kakaoRejected':
      return failure.isCancelled
        ? '카카오 로그인을 취소했습니다'
        : '카카오 인가에 실패했습니다';
    case 'missingCode':
      return '인가 코드가 없습니다. 로그인 화면에서 다시 시작해 주세요';
    case 'stateMismatch':
      return '로그인 요청을 확인하지 못했습니다. 처음부터 다시 시도해 주세요';
    case 'exchangeFailed':
      return failure.message;
  }
}

/**
 * 카카오가 되돌려보낸 인가 코드를 세션으로 바꾼다 (`/oauth/kakao`).
 *
 * 화면이랄 것이 거의 없고 대부분 즉시 지나간다. 그래도 라우트를 갖는 이유는
 * 카카오에 등록한 redirect URI 가 실제로 열리는 주소여야 하기 때문이다.
 */
export function KakaoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate } = useKakaoLogin();

  /**
   * 초기화 함수로 한 번만 계산한다. 매 렌더 다시 읽으면, 교환이 시작되면서 지워진
   * `state` 때문에 진행 중인 화면이 "확인 실패"로 뒤집힌다.
   */
  const [preflight] = useState(() => readPreflight(searchParams));
  const [exchangeFailure, setExchangeFailure] =
    useState<CallbackFailure | null>(null);

  /**
   * **인가 코드는 한 번만 쓸 수 있다.** StrictMode 는 개발에서 이펙트를 두 번 실행하고
   * 두 번째 교환은 반드시 실패하므로, 성공한 로그인이 곧바로 에러 화면으로 덮인다.
   * 의존성 배열로는 막을 수 없다 — 같은 값으로 다시 도는 것이 StrictMode 의 목적이다.
   */
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    // 대조가 끝났으므로 성공·실패와 무관하게 버린다. 난수는 일회용이다.
    clearOauthState();

    if (preflight.kind !== 'ready') {
      return;
    }

    mutate(
      {
        authorizationCode: preflight.authorizationCode,
        // 인가 때 쓴 값과 같아야 카카오가 토큰으로 바꿔 준다 (apiSpec §2.1).
        redirectUri: KAKAO_REDIRECT_URI,
      },
      {
        /**
         * `replace: true` — 이 주소를 기록에 남기지 않는다. 남기면 뒤로가기로
         * 이미 소진된 코드가 붙은 URL 로 되돌아와 실패 화면을 본다.
         */
        onSuccess: () => navigate(preflight.redirectTo, { replace: true }),
        onError: (error) =>
          setExchangeFailure({
            kind: 'exchangeFailed',
            message: isHttpError(error)
              ? error.message
              : '로그인을 완료하지 못했습니다',
          }),
      },
    );
  }, [mutate, navigate, preflight]);

  const failure =
    preflight.kind === 'failed' ? preflight.failure : exchangeFailure;

  if (failure === null) {
    return (
      <section
        className="rounded-xl border border-slate-200 p-4"
        aria-busy="true"
      >
        <p className="text-sm text-slate-600">로그인 중입니다</p>
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-2 h-4 w-24" />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-900">{describeFailure(failure)}</p>
      <Link
        to="/login"
        replace
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
      >
        로그인 화면으로
      </Link>
    </section>
  );
}
