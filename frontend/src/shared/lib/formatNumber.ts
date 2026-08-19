/**
 * 숫자 포매터 (컨벤션 §6).
 * toFixed / toLocaleString 이 컴포넌트 JSX 안에 보이면 규약 위반이다.
 * 같은 숫자가 화면마다 다르게 보이는 사고를 막으려고 여기 모은다.
 */

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR');

/** 원 단위 정수를 천 단위 구분 기호와 함께 표시한다. `73,500원` */
export function formatKrw(amount: number): string {
  return `${KRW_FORMATTER.format(Math.round(amount))}원`;
}

/**
 * 0~1 사이 소수인 비율을 부호 붙은 퍼센트로 바꾼다 (컨벤션 §6).
 * 0.0123 → `+1.23%`
 */
export function formatSignedPercent(ratio: number, fractionDigits = 2): string {
  const percent = ratio * 100;
  const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${sign}${Math.abs(percent).toFixed(fractionDigits)}%`;
}

/** 등락 방향. 색은 이 값으로 의미 토큰을 고른다. 색 이름을 직접 쓰지 않는다. */
export type PriceDirection = 'rise' | 'fall' | 'flat';

export function getPriceDirection(changeRatio: number): PriceDirection {
  if (changeRatio > 0) {
    return 'rise';
  }
  if (changeRatio < 0) {
    return 'fall';
  }
  return 'flat';
}
