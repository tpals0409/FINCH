// DIRECTION: mono (S15P21A101-95)

import type { ReactNode } from 'react';

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

/**
 * 항목 한 줄. 왼쪽에 이름, 오른쪽에 값.
 *
 * 행을 가르는 것은 hairline 하나다. 첫 행에는 선을 두지 않는다 —
 * 카드의 위쪽 광과 겹쳐 두 겹으로 보인다.
 *
 * 값은 오른쪽 정렬한다. 자릿수가 세로로 맞아야 두 행의 크기를 눈으로
 * 비교할 수 있다. 고정폭 숫자는 화면 전체에 걸려 있다.
 */
export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="mono-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
