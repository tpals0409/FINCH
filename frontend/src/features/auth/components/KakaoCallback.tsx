import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import { KAKAO_REDIRECT_URI } from '@/shared/config/env';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useKakaoLogin } from '../api/useKakaoLogin';
import { clearOauthState } from '../lib/oauthState';
import {
  readCallbackPreflight,
  type CallbackFailure,
} from '../lib/readCallbackPreflight';

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
 * 대부분 즉시 지나가지만 라우트를 갖는 이유는 카카오에 등록한 redirect URI 가
 * 실제로 열리는 주소여야 하기 때문이다.
 */
export function KakaoCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutate } = useKakaoLogin();

  // 초기화 함수로 한 번만 계산한다. 매 렌더 다시 읽으면 교환이 시작되면서 지워진
  // state 때문에 진행 중인 화면이 확인 실패로 뒤집힌다.
  const [preflight] = useState(() => readCallbackPreflight(searchParams));
  const [exchangeFailure, setExchangeFailure] =
    useState<CallbackFailure | null>(null);

  // 인가 코드는 한 번만 쓸 수 있다. StrictMode 의 두 번째 실행이 반드시 실패해
  // 성공한 로그인을 에러 화면으로 덮으므로 의존성 배열로는 막을 수 없다.
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
        // replace 로 이동한다. 기록에 남기면 뒤로가기로 이미 소진된 코드가 붙은
        // URL 로 되돌아와 실패 화면을 본다.
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
      <Card aria-busy="true">
        <p className="text-sm text-fg-neutral-subtle">로그인 중입니다</p>
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-2 h-4 w-24" />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-fg-neutral">{describeFailure(failure)}</p>
      <LinkButton to="/login" replace className="mt-3">
        로그인 화면으로
      </LinkButton>
    </Card>
  );
}
