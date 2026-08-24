import type { ReactNode } from 'react';

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

/**
 * 항목 한 줄. 왼쪽에 이름, 오른쪽에 값.
 *
 * 행을 가르는 것은 hairline 하나다. 첫 행에는 선을 두지 않는다 —
 * 카드 테두리가 이미 그 자리에 있어서 선이 겹쳐 두 겹으로 보인다.
 *
 * 값은 오른쪽 정렬한다. 자릿수가 세로로 맞아야 두 행의 크기를 눈으로
 * 비교할 수 있다. 고정폭 숫자는 지면 전체에 걸려 있다.
 */
export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0">
      <dt className="text-note text-text-muted">{label}</dt>
      <dd className="text-note font-medium text-text">{value}</dd>
    </div>
  );
}
