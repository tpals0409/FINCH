// DIRECTION: mono (S15P21A101-95)

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
 * **테두리를 두르지 않는다.** 이 방향에서 면을 가르는 것은 선이 아니라 깊이다 —
 * 지면보다 밝은 표면 + 아래로 떨어지는 부드러운 그림자 + 위·오른쪽 모서리의
 * 얇은 광. 셋이 함께 있어야 카드가 만질 수 있는 물건으로 읽히고, 사실적 3D 로
 * 렌더된 캐릭터와 같은 공간에 있게 된다. 선을 하나 두르면 그 순간 종이가 된다.
 *
 * 그림자 방향은 화면 전체에서 하나다. 광원이 오른쪽 위에 있다 —
 * 근거는 `styles/mono.css` 주석에 실측값으로 적었다.
 *
 * **카드를 남발하지 않는다.** 이 화면에 카드는 탭 패널 하나뿐이다.
 * 표제부는 카드에 담지 않는다 — 그 위계는 상자가 아니라 활자 크기가 만든다.
 * 3D 표면은 플랫 카드보다 존재감이 크므로 남발하면 화면이 더 빨리 무너진다.
 *
 * 라운드는 22px 이다. 캐릭터가 둥근 덩어리라 모서리를 넉넉히 굴린다.
 */
export function SectionCard({
  label,
  note,
  isFlush = false,
  children,
}: SectionCardProps) {
  const bodyClass = isFlush
    ? ''
    : label === undefined
      ? 'mono-card-body'
      : 'mono-card-body-tight';

  return (
    <section className="mono-card">
      {label === undefined ? null : (
        <div className="mono-card-head">
          <h2 className="mono-section mono-fg">{label}</h2>
          {note === undefined ? null : (
            <p className="mono-mono mono-meta mono-fg-muted">{note}</p>
          )}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
