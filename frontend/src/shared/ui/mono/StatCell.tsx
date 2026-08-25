// DIRECTION: mono (S15P21A101-95)

import type { ReactNode } from 'react';

type StatCellProps = {
  label: string;
  value: ReactNode;
};

/**
 * 지표 한 칸. 레이블이 위, 값이 아래다.
 *
 * 칸에 면도 그림자도 주지 않는다. 격자를 만드는 것은 여백뿐이다 —
 * 3D 표면 안에 3D 표면을 또 넣으면 깊이가 중첩되어 어느 것이 위인지 읽히지 않는다.
 * 이 방향에서 떠 있는 것은 카드·탭의 고른 칸·기간의 고른 칸·주문 버튼뿐이다.
 */
export function StatCell({ label, value }: StatCellProps) {
  return (
    <div className="mono-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
