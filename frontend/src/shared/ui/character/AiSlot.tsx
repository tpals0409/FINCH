// DIRECTION: character (S15P21A101-93)

import type { ReactNode } from 'react';

import { Button } from './Button';
import { FinchImage, type FinchBird, type FinchPose } from './FinchImage';
import { Skeleton } from './Skeleton';

/**
 * AI 슬롯의 네 상태.
 * `insufficient` 는 에러가 아니다. 서버는 정상이고 설명할 자료가 모이지 않은
 * 것이므로 재시도해도 결과가 같다. 에러와 같은 모양으로 그리면 사용자가 계속
 * 다시 누른다.
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
  /**
   * 이 슬롯에 앉을 새.
   *
   * 애플 방향의 `AiSlot` 에는 없는 인자다. **선택 인자로 둔 이유가 있다** —
   * `shared` 는 종목을 모르므로 기분(핑치/블루치)을 스스로 정할 수 없고,
   * 그렇다고 필수로 만들면 애플 방향의 호출부가 그대로 옮겨 오지 못한다.
   * 넘기지 않으면 핑치가 선다. 이 방향이 탈락하면 파일째 사라지는 인자다.
   */
  bird?: FinchBird;
  children?: ReactNode;
};

/**
 * 상태마다 다른 포즈를 세운다. 색(핑치/블루치)은 종목의 기분이 정하고,
 * 포즈는 슬롯의 상태가 정한다. 두 축이 섞이지 않게 여기서만 포즈를 고른다.
 */
const STATUS_POSE: Record<AiSlotStatus, FinchPose> = {
  loading: 'analyze',
  ready: 'idea',
  error: 'think',
  insufficient: 'think',
};

/**
 * AI 응답 한 칸의 공통 껍데기. AI 6종 슬롯 전부가 이 껍데기를 쓴다.
 *
 * 이 컴포넌트는 **응답 본문의 모양을 모른다.** `analysis` 응답 스키마가
 * 미확정이라 (`contracts.md` P8) 지금 타입을 꽂으면 회신이 온 날 여섯 곳을
 * 같이 고쳐야 한다. 상태와 틀만 여기서 정하고 본문은 `children` 으로 받는다.
 *
 * **캐릭터의 자리가 여기다** (2026-08-24 결정). 새는 슬롯 머리에 작게 앉아
 * 지금 무슨 상태인지를 포즈로 거든다 — 분석 중이면 노트북, 답이 나왔으면
 * 전구, 못 냈으면 물음표다. 그래도 상태를 말하는 것은 문장이고 새가 아니다.
 * 그림이 안 뜨거나 스크린 리더로 읽어도 같은 정보가 남아야 한다.
 *
 * 슬롯을 색으로 표시하지 않는다. AI 라고 보라색이나 그라데이션을 두르는 것이
 * 이 제품의 명시적 실패 조건이다 — 캐릭터 방향에서도 예외가 아니다.
 */
export function AiSlot({
  status,
  label,
  message,
  footnote,
  onRetry,
  bird = 'pinchi',
  children,
}: AiSlotProps) {
  return (
    <div>
      <div className="flex items-center gap-2.5 border-b border-[var(--character-border)] pb-2">
        <FinchImage bird={bird} pose={STATUS_POSE[status]} height="2.25rem" />
        <p className="text-[0.8125rem] font-medium tracking-[0.02em] text-[var(--character-text-muted)]">
          {label}
        </p>
      </div>

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
          <p className="text-[1.0625rem] leading-[1.47] break-keep text-[var(--character-text)]">
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
          <p className="text-[1.0625rem] leading-[1.47] break-keep text-[var(--character-text)]">
            {message ?? `${label}을 낼 자료가 아직 모이지 않았습니다`}
          </p>
          {/* 재시도 버튼을 두지 않는다. 자료가 모여야 바뀌는 상태다.
              대신 무엇이 없는지와 그동안 무엇을 보면 되는지를 적는다 (컨벤션 §7). */}
          <p className="mt-1.5 text-[0.9375rem] break-keep text-[var(--character-text-muted)]">
            자료가 모이면 다시 보입니다. 지금은 시세와 기업 정보로 판단해
            주세요.
          </p>
        </div>
      ) : null}

      {status === 'ready' ? (
        <div className="mt-3.5">
          {children}
          {footnote === undefined ? null : (
            <p className="mt-5 border-t border-[var(--character-border)] pt-3 font-[family-name:var(--character-font-mono)] text-[0.8125rem] leading-relaxed text-[var(--character-text-muted)]">
              {footnote}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
