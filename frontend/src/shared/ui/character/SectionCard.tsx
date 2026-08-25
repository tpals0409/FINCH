// DIRECTION: character (S15P21A101-93)

import type { ReactNode } from 'react';

type SectionCardProps = {
  /** 구획 이름. 생략하면 표제 줄 없이 내용만 담는다. */
  label?: string;
  /** 표제 오른쪽 끝에 붙는 짧은 부가 표기. 시각·출처 같은 것. */
  note?: ReactNode;
  /** 좌우 여백을 지운다. 차트처럼 카드 폭을 끝까지 써야 하는 내용에만. */
  isFlush?: boolean;
  children: ReactNode;
};

/**
 * 카드 한 장. props 는 애플 방향과 같다.
 *
 * 이 방향은 지면이 크림이고 카드가 흰색이라 배경 단차가 애플 방향과 반대다.
 * 크림 위의 흰 카드는 design8 의 문법이고, 새가 앉을 크림 여백을 화면에
 * 남겨 준다 — 카드가 지면을 다 덮으면 캐릭터가 설 자리가 없다.
 *
 * **카드를 남발하지 않는다.** 이 화면의 카드는 탭 패널뿐이다. 표제부와
 * 말풍선은 카드에 담지 않는다.
 */
export function SectionCard({
  label,
  note,
  isFlush = false,
  children,
}: SectionCardProps) {
  return (
    <section data-card className="character-card">
      {label === undefined ? null : (
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-[var(--character-text)]">
            {label}
          </h2>
          {note === undefined ? null : (
            <p className="font-[family-name:var(--character-font-mono)] text-[0.8125rem] text-[var(--character-text-muted)]">
              {note}
            </p>
          )}
        </div>
      )}
      <div
        className={
          isFlush ? '' : label === undefined ? 'px-5 py-4' : 'px-5 pt-2 pb-4'
        }
      >
        {children}
      </div>
    </section>
  );
}
