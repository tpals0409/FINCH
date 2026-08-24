import type { ReactNode } from 'react';

import { Button } from './Button';
import { Skeleton } from './Skeleton';

/**
 * AI 슬롯의 네 상태.
 * `insufficient` 는 에러가 아니다. 서버는 정상이고 설명할 자료가 모이지 않은 것이므로
 * 재시도해도 결과가 같다. 에러와 같은 모양으로 그리면 사용자가 계속 다시 누른다.
 */
export type AiSlotStatus = 'loading' | 'error' | 'insufficient' | 'ready';

type AiSlotProps = {
  status: AiSlotStatus;
  /** 슬롯 이름. `AI 소견`, `AI 진단`, `AI 브리핑` 처럼 그 자리의 역할을 부른다. */
  label: string;
  /** 서버가 완성해서 준 문장. 프론트가 문구를 다시 만들지 않는다 (컨벤션 §5). */
  message?: string;
  /** 데이터 기준 시각·면책 같은 각주. `ready` 에서만 보인다. */
  footnote?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

/**
 * AI 응답 한 칸의 공통 껍데기. AI 6종 슬롯 전부가 이 껍데기를 쓴다.
 *
 * 이 컴포넌트는 **응답 본문의 모양을 모른다.** `analysis` 응답 스키마가 미확정이라
 * (`contracts.md` P8) 지금 타입을 꽂으면 회신이 온 날 여섯 곳을 같이 고쳐야 한다.
 * 상태와 틀만 여기서 정하고 본문은 `children` 으로 받는다.
 *
 * 슬롯을 색으로 표시하지 않는다. AI 라고 보라색이나 그라데이션을 두르는 것이
 * 이 제품의 명시적 실패 조건이다. 표시는 레이블 한 줄과 그 아래 hairline 뿐이고,
 * 슬롯이 AI 라는 사실보다 그 안의 문장이 눈에 먼저 들어와야 한다 —
 * AI 는 답이 아니라 근거다 (원칙 4).
 */
export function AiSlot({
  status,
  label,
  message,
  footnote,
  onRetry,
  children,
}: AiSlotProps) {
  return (
    <div>
      <p className="border-b border-border pb-2 text-meta font-medium tracking-[0.02em] text-text-muted">
        {label}
      </p>

      {status === 'loading' ? (
        <>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[88%]" />
            <Skeleton className="h-4 w-[62%]" />
          </div>
          <p className="sr-only" role="status">
            {label}을 불러오는 중입니다
          </p>
        </>
      ) : null}

      {status === 'error' ? (
        <div className="mt-3.5">
          <p className="text-body text-text">
            {message ?? `${label}을 불러오지 못했습니다`}
          </p>
          {onRetry === undefined ? null : (
            <div className="mt-3.5">
              <Button onClick={onRetry}>다시 시도</Button>
            </div>
          )}
        </div>
      ) : null}

      {status === 'insufficient' ? (
        <div className="mt-3.5">
          <p className="text-body text-text">
            {message ?? `${label}을 낼 자료가 아직 모이지 않았습니다`}
          </p>
          {/* 재시도 버튼을 두지 않는다. 자료가 모여야 바뀌는 상태다.
              대신 무엇이 없는지와 그동안 무엇을 보면 되는지를 적는다 (컨벤션 §7). */}
          <p className="mt-1.5 text-note text-text-muted">
            자료가 모이면 다시 보입니다. 지금은 시세와 기업 정보로 판단해
            주세요.
          </p>
        </div>
      ) : null}

      {status === 'ready' ? (
        <div className="mt-3.5">
          {children}
          {footnote === undefined ? null : (
            <p className="mt-5 border-t border-border pt-3 font-mono text-meta leading-relaxed text-text-muted">
              {footnote}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
