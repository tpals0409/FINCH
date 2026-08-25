// DIRECTION: character (S15P21A101-93)

import type { ReactNode } from 'react';

type StatCellProps = {
  label: string;
  value: ReactNode;
};

/**
 * 지표 한 칸. 레이블이 위, 값이 아래다. props 는 애플 방향과 같다.
 *
 * 칸에 테두리도 배경도 주지 않는다. 격자를 만드는 것은 여백뿐이다 —
 * 카드 안에 작은 상자 넷을 그리면 카드 안에 카드가 생긴다.
 */
export function StatCell({ label, value }: StatCellProps) {
  return (
    <div>
      <dt className="text-[0.8125rem] text-[var(--character-text-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[0.9375rem] font-medium text-[var(--character-text)]">
        {value}
      </dd>
    </div>
  );
}
