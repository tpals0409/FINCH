import type { ReactNode } from 'react';

type PlateSectionProps = {
  /** 구획 이름. 도감 지면의 항목 표제 자리다. */
  label: string;
  /** 표제 오른쪽 끝에 붙는 짧은 부가 표기. 시각·출처 같은 것. */
  note?: ReactNode;
  /** 표제 줄 아래에 놓이는 조작부. 기간 선택처럼 구획에 딸린 것. */
  control?: ReactNode;
  children: ReactNode;
};

/**
 * 도감 지면의 한 구획.
 *
 * **카드가 아니다.** 둥근 모서리도, 그림자도, 배경색 차이도 없다.
 * 구획을 나누는 것은 위쪽 1px 괘선 하나뿐이고, 그 괘선 격자가 곧 레이아웃이다.
 * 이 컴포넌트에 `rounded` 나 `shadow` 를 붙이는 순간 비주얼 방향이 죽는다.
 */
export function PlateSection({
  label,
  note,
  control,
  children,
}: PlateSectionProps) {
  return (
    <section className="border-t border-rule">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="font-display text-[0.8125rem] font-semibold tracking-[0.14em] text-ink">
          {label}
        </h2>
        {note === undefined ? null : (
          <p className="font-mono text-[0.6875rem] text-ink-muted">{note}</p>
        )}
      </div>
      {control === undefined ? null : control}
      {children}
    </section>
  );
}
