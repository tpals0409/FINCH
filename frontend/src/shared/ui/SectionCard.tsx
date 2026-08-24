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
 * 카드 한 장.
 *
 * **카드는 세 겹 방어를 다 갖춘다** — 배경 단차(지면 → 표면) + 1px 테두리 +
 * 그림자. 셋 중 하나를 빼면 다크 모드에서 카드가 지면에 녹아 사라진다.
 * 라이트 모드에서는 반대로 흰 지면에 흰 카드가 얹혀 형태가 없어진다.
 *
 * **카드를 남발하지 않는다.** 이 화면에 카드는 둘뿐이다 — 탭 내용과 내 보유.
 * 표제부(종목명·현재가)는 카드에 담지 않는다. 그 위계는 상자가 아니라
 * 활자 크기가 만든다. 카드가 셋을 넘으면 화면이 부트캠프 템플릿이 된다.
 *
 * 라운드는 18px 이다. 8px 미만은 애플 어휘가 아니고, 24px 이상은 모바일
 * 폭에서 내용이 들어갈 자리를 먹는다.
 */
export function SectionCard({
  label,
  note,
  isFlush = false,
  children,
}: SectionCardProps) {
  return (
    <section
      data-card
      className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-card"
    >
      {label === undefined ? null : (
        <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="text-section font-semibold text-text">{label}</h2>
          {note === undefined ? null : (
            <p className="font-mono text-meta text-text-muted">{note}</p>
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
