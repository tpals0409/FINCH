import type { ReactNode } from 'react';

/**
 * AI 슬롯의 네 상태.
 * `insufficient` 는 에러가 아니다. 서버는 정상이고 설명할 자료가 모이지 않은 것이므로
 * 재시도해도 결과가 같다. 에러와 같은 모양으로 그리면 사용자가 계속 다시 누른다.
 */
export type AiSlotStatus = 'loading' | 'error' | 'insufficient' | 'ready';

type AiSlotProps = {
  status: AiSlotStatus;
  /** 슬롯 이름. `소견`, `진단`, `브리핑` 처럼 그 자리의 역할을 부른다. */
  label: string;
  /** 서버가 완성해서 준 문장. 프론트가 문구를 다시 만들지 않는다 (컨벤션 §5). */
  message?: string;
  /** 데이터 기준 시각·면책 같은 각주. `ready` 에서만 보인다. */
  footnote?: string;
  onRetry?: () => void;
  children?: ReactNode;
};

/**
 * AI 응답 한 칸의 공통 껍데기.
 *
 * 이 컴포넌트는 **응답 본문의 모양을 모른다.** `analysis` 응답 스키마가 미확정이라
 * (`contracts.md` P8) 지금 타입을 꽂으면 회신이 온 날 여섯 곳을 같이 고쳐야 한다.
 * 상태와 틀만 여기서 정하고 본문은 `children` 으로 받는다.
 * AI 6종 슬롯 전부가 이 껍데기를 쓴다.
 *
 * 왼쪽 세로 3px 올리브 표지선이 이 칸이 AI 소견임을 말한다. 이 화면에서
 * 종 표지색을 쓰는 자리는 여기와 관심 등록 표시 둘뿐이다.
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
    <div className="border-l-[3px] border-specimen px-4 py-3.5">
      <p className="font-mono text-[0.6875rem] tracking-[0.16em] text-specimen-ink">
        {label}
      </p>

      {status === 'loading' ? (
        <div className="mt-3 animate-pulse space-y-2" aria-hidden="true">
          <div className="h-3 w-full bg-rule-faint" />
          <div className="h-3 w-[88%] bg-rule-faint" />
          <div className="h-3 w-[64%] bg-rule-faint" />
        </div>
      ) : null}
      {status === 'loading' ? (
        <p className="sr-only" role="status">
          {label}을 불러오는 중입니다
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="mt-2.5">
          <p className="text-[0.9375rem] leading-relaxed text-ink">
            {message ?? `${label}을 불러오지 못했습니다`}
          </p>
          {onRetry === undefined ? null : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink"
            >
              다시 시도
            </button>
          )}
        </div>
      ) : null}

      {status === 'insufficient' ? (
        <div className="mt-2.5">
          <p className="text-[0.9375rem] leading-relaxed text-ink">
            {message ?? `${label}을 낼 자료가 아직 모이지 않았습니다`}
          </p>
          {/* 재시도 버튼을 두지 않는다. 자료가 모여야 바뀌는 상태다.
              대신 무엇이 없는지와 언제 다시 보면 되는지를 적는다 (컨벤션 §7). */}
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
            자료가 모이면 다시 보입니다. 지금은 시세와 기업 정보로 판단해
            주세요.
          </p>
        </div>
      ) : null}

      {status === 'ready' ? (
        <div className="mt-2.5">
          {children}
          {footnote === undefined ? null : (
            <p className="mt-3 border-t border-rule-faint pt-2 font-mono text-[0.6875rem] leading-relaxed text-ink-muted">
              {footnote}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
