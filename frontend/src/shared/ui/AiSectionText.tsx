import type { AiSegment } from '@/shared/types/ai/envelope';

const DIRECTION_CLASS = {
  up: 'text-fg-up',
  down: 'text-fg-down',
} as const;

/**
 * AI 서술 한 덩어리 (AI 명세 §2.3).
 *
 * **`segments` 를 이어 붙이면 `text` 와 정확히 일치한다.** 그래서 조각이 비어 있으면
 * `text` 를 그대로 쓰고, 있으면 수치 조각에만 색을 입힌다. 두 벌을 다 그리면 문장이 두 번 나온다.
 *
 * 등락 색은 국내 관례다 — 상승 적색, 하락 청색. `direction` 이 `null` 인 수치
 * (비중·점수처럼 방향이 없는 값)에는 색을 넣지 않는다. 색이 방향을 뜻하는데
 * 방향 없는 값에 칠하면 없는 뜻이 생긴다.
 */
export function AiSectionText({
  text,
  segments,
  className = '',
}: {
  text: string;
  segments: AiSegment[];
  className?: string;
}) {
  if (segments.length === 0) {
    return (
      <p
        className={`text-body-1 whitespace-pre-line text-fg-neutral ${className}`}
      >
        {text}
      </p>
    );
  }

  return (
    <p
      className={`text-body-1 whitespace-pre-line text-fg-neutral ${className}`}
    >
      {segments.map((segment, index) => {
        const direction = segment.direction;
        if (segment.type === 'text' || direction === null) {
          return <span key={index}>{segment.value}</span>;
        }
        return (
          <span
            key={index}
            className={`tabular-nums ${DIRECTION_CLASS[direction]}`}
          >
            {segment.value}
          </span>
        );
      })}
    </p>
  );
}
