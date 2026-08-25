// DIRECTION: mono (S15P21A101-95)

import type { PriceDirection } from '@/shared/lib/formatNumber';

/**
 * 캐릭터가 어느 값을 보고 있는지. 화면에는 안 보이고 스크린 리더에만 읽힌다.
 *
 * 이 화면에는 부호를 가진 값이 둘이다 — 당일 등락과 내 평가손익.
 * 눈으로 보는 사용자는 캐릭터 옆에 붙은 수치로 무엇을 말하는지 알지만,
 * 소리로 듣는 사용자에게는 "새 그림"만 남는다. 기준을 문장으로 적어 준다.
 */
export type FinchBasis = 'holding' | 'quote';

type FinchProps = {
  direction: PriceDirection;
  basis: FinchBasis;
};

/**
 * 포즈 배정.
 *
 * **캐릭터에 색을 입히지 않는다.** 이 방향의 값어치가 무채색이라는 데 있다.
 * 그래서 등락을 색이 아니라 **포즈**로 거든다.
 *
 * - `rise`  두 날개를 활짝 편 웃음. 시트에서 표정이 드러나는 유일한 포즈이고,
 *   실루엣이 가장 넓어 80px 에서도 무엇을 하는지 읽힌다
 * - `fall`  몸을 돌리고 어깨너머로 돌아봄. 시트에 슬픈 얼굴이 없고, 있더라도
 *   손실 앞에서 우는 캐릭터는 조롱으로 읽힌다. 물러서되 눈은 떼지 않는
 *   자세가 이 도메인에서 낼 수 있는 가장 정직한 신호다
 * - `flat`  갸웃. 방향이 정해지지 않았다는 뜻이 자세 하나로 전달된다
 *
 * **엄지척 포즈는 쓰지 않았다.** 상승에 얹으면 "잘 샀다"는 승인으로 읽힌다.
 * 모의투자라도 매매를 추천하는 것처럼 보이는 자리를 만들지 않는다.
 * **상승 화살표를 보는 포즈와 계단 차트 포즈도 뺐다.** 방향은 더 분명하지만
 * 둘 다 가는 흰 화살표·회색 막대에 의미가 실려 있어 80px 로 줄이면 사라지고,
 * 화살표는 라이트 지면에서 흰색이라 보이지도 않는다. 또 그 둘은 옆에 있는
 * ▲▼ 와 같은 말을 두 번 한다.
 */
const POSE: Record<PriceDirection, { source: string; alt: string }> = {
  rise: {
    source: '/character-mono/finch-wings-open.png',
    alt: '두 날개를 활짝 편 핀치',
  },
  fall: {
    source: '/character-mono/finch-turned-away.png',
    alt: '몸을 돌리고 어깨너머로 돌아보는 핀치',
  },
  flat: {
    source: '/character-mono/finch-tilt.png',
    alt: '고개를 갸웃한 핀치',
  },
};

const BASIS_LABEL: Record<FinchBasis, string> = {
  holding: '내 평가손익',
  quote: '오늘 등락',
};

const DIRECTION_LABEL: Record<PriceDirection, string> = {
  rise: '오름',
  fall: '내림',
  flat: '변동 없음',
};

/**
 * 화면의 캐릭터 한 자리.
 *
 * **주인공은 숫자다.** 이 새는 한 화면에 한 번만 나오고, 표제부에서 종목명
 * 오른쪽의 원래 비어 있던 자리를 쓴다. 현재가는 그 아래에서 폭을 온전히 갖는다 —
 * 캐릭터가 최대 활자와 가로로 경쟁하지 않게 한 배치다.
 *
 * **말풍선을 두지 않는다.** 새가 "오늘 3.2% 올랐어요" 라고 말하기 시작하면
 * 숫자를 문장이 대신하게 된다. 숫자는 숫자로 보여준다.
 *
 * 접지 그림자는 PNG 에 굽지 않고 CSS 로 그린다 (`.mono-finch::after`).
 * 화면의 다른 그림자와 같은 광원(오른쪽 위)을 따라야 새가 화면 위에 뜨지 않는다.
 */
export function Finch({ direction, basis }: FinchProps) {
  const pose = POSE[direction];

  return (
    <span className="mono-finch">
      <img
        src={pose.source}
        alt={pose.alt}
        width={289}
        height={240}
        decoding="async"
      />
      <span className="mono-sr-only">
        {BASIS_LABEL[basis]} {DIRECTION_LABEL[direction]}
      </span>
    </span>
  );
}
