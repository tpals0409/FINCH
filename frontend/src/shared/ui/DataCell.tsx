import type { ReactNode } from 'react';

type DataCellProps = {
  label: string;
  value: ReactNode;
  /** 값이 길어 두 칸을 다 쓰는 항목. 세로 괘선을 지우고 폭을 합친다. */
  isWide?: boolean;
};

/**
 * 계측표의 한 칸. 이름이 위, 값이 아래다.
 *
 * `DataRow` 와 나눠 둔 이유는 읽는 방식이 다르기 때문이다. 항목이 많고 이름이
 * 길면 한 줄에 이름·값을 놓는 `DataRow` 가 낫고, 항목이 적고 값이 짧으면
 * 두 칸 격자가 훨씬 짧게 끝난다. 격자는 도감 계측표의 문법이기도 하다.
 *
 * 괘선은 위쪽과 오른쪽에만 있다. 홀수 칸에만 오른쪽 괘선을 두면 두 칸 격자
 * 가운데에 세로선 하나가 서고, 바깥 테두리는 생기지 않는다 — 카드가 되지 않는다.
 */
export function DataCell({ label, value, isWide = false }: DataCellProps) {
  return (
    <div
      className={`border-t border-rule-faint px-4 py-2 ${
        isWide ? 'col-span-2' : 'odd:border-r'
      }`}
    >
      <dt className="font-display text-[0.75rem] tracking-[0.06em] text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-[0.9375rem] font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}
