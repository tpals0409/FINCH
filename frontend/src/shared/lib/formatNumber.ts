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

/**
 * 등락률·수익률은 **백분율 값**으로 온다 (계약 C18). `-1.21` 이 -1.21% 다.
 * `formatSignedPercent` 와 달리 100 을 곱하지 않는다. 둘을 헷갈리면
 * 등락률이 100배로 표시되거나 100분의 1로 표시된다.
 */
export function formatSignedChangeRate(
  changeRate: number,
  fractionDigits = 2,
): string {
  const sign = changeRate > 0 ? '+' : changeRate < 0 ? '-' : '';
  return `${sign}${Math.abs(changeRate).toFixed(fractionDigits)}%`;
}

/** 등락액처럼 부호가 정보인 금액. `-900원` / `+1,200원` / `0원` */
export function formatSignedKrw(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}${KRW_FORMATTER.format(Math.abs(rounded))}원`;
}

/** 부호 없는 정수. 거래량·주식수처럼 단위를 밖에서 붙이는 값에 쓴다. */
export function formatCount(count: number): string {
  return KRW_FORMATTER.format(Math.round(count));
}

/** PER·PBR 처럼 소수 자릿수가 의미를 갖는 지표. */
export function formatDecimal(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

const TRILLION = 1_000_000_000_000;
const HUNDRED_MILLION = 100_000_000;

/**
 * 큰 금액을 한국식 단위로 축약한다 (크로스파트 계약 §1). `438.8조` / `9,074억`
 * 시가총액·거래대금처럼 원 단위 전체를 읽을 필요가 없는 값에만 쓴다.
 */
export function formatCompactKrw(amount: number): string {
  const absolute = Math.abs(amount);
  if (absolute >= TRILLION) {
    return `${(amount / TRILLION).toFixed(1)}조`;
  }
  if (absolute >= HUNDRED_MILLION) {
    return `${KRW_FORMATTER.format(Math.round(amount / HUNDRED_MILLION))}억`;
  }
  return formatKrw(amount);
}
