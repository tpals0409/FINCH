import type { ReactNode } from 'react';

type DataRowProps = {
  label: string;
  value: ReactNode;
};

/**
 * 계측치 한 줄. 왼쪽에 이름, 오른쪽에 값.
 *
 * 행 사이를 가르는 것은 얇은 괘선 하나다. 격자가 표를 만든다.
 * 값은 오른쪽 정렬한다. 자릿수가 세로로 맞아야 두 행의 크기를 눈으로 비교할 수 있다.
 */
export function DataRow({ label, value }: DataRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-rule-faint px-4 py-2.5 first:border-t-0">
      <dt className="font-display text-[0.8125rem] tracking-[0.02em] text-ink-muted">
        {label}
      </dt>
      <dd className="text-[0.9375rem] font-semibold text-ink">{value}</dd>
    </div>
  );
}
