// DIRECTION: mono (S15P21A101-95)

import type { PriceDirection } from '@/shared/lib/formatNumber';

type DirectionMarkProps = {
  direction: PriceDirection;
  /** 글자 크기에 맞춰 지정한다. 기본은 본문 크기 수치 옆에 놓는 값이다. */
  size?: number;
};

const DIRECTION_LABEL: Record<PriceDirection, string> = {
  rise: '상승',
  fall: '하락',
  flat: '보합',
};

/**
 * 등락 방향 삼각형.
 *
 * **등락을 색으로만 말하지 않는다.** 색 + 부호 + 삼각형 셋을 항상 함께 쓴다.
 * 한국인 남성의 약 5%가 적록색약이고 이 화면의 핵심 정보가 적/청 대비에 실려 있다.
 *
 * **캐릭터 포즈도 단독 신호가 되어서는 안 된다.** 이 화면에는 새가 한 마리뿐이고
 * 무채색이라 등락을 포즈로 거들 뿐인데, 포즈만 읽고 방향을 판단하게 두면
 * 캐릭터가 수치를 대신 말하게 된다. 이 도형이 그 자리를 막는다.
 *
 * 유니코드 ▲▼ 를 쓰지 않는 이유는 서체마다 글리프 크기와 기준선이 달라
 * 수치 옆에서 높이가 맞지 않기 때문이다. 도형은 그린다.
 *
 * 색은 부모가 정하고 여기서는 `currentColor` 를 따른다.
 * 보합은 도형 대신 가로 막대다. 방향이 없는 상태에 삼각형을 쓰면 방향을 읽게 된다.
 */
export function DirectionMark({ direction, size = 10 }: DirectionMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="currentColor"
      role="img"
      aria-label={DIRECTION_LABEL[direction]}
      style={{ flex: 'none' }}
    >
      {direction === 'rise' ? <path d="M5 1.5 9.5 8.5H0.5z" /> : null}
      {direction === 'fall' ? <path d="M5 8.5 0.5 1.5h9z" /> : null}
      {direction === 'flat' ? (
        <rect x="0.5" y="4.25" width="9" height="1.5" />
      ) : null}
    </svg>
  );
}
