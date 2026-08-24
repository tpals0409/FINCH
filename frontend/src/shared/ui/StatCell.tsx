import type { ReactNode } from 'react';

type StatCellProps = {
  label: string;
  value: ReactNode;
};

/**
 * 지표 한 칸. 레이블이 위, 값이 아래다.
 *
 * 칸에 테두리도 배경도 주지 않는다. 격자를 만드는 것은 여백뿐이다 —
 * 네 개의 작은 상자를 그리면 카드 안에 카드가 생기고, 그게 증권앱이
 * 정보를 채워 넣어 유능해 보이려 할 때 나오는 형태다.
 *
 * 레이블과 값의 위계는 크기와 색이 만든다. 레이블은 13px 보조 먹,
 * 값은 15px 먹이다. 굵기로 더 벌리지 않는다 — 이미 충분하다.
 */
export function StatCell({ label, value }: StatCellProps) {
  return (
    <div>
      <dt className="text-meta text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-note font-medium text-text">{value}</dd>
    </div>
  );
}
