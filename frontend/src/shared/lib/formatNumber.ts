import type { Percent, Ratio } from '@/shared/types/primitives';

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
 * **왜 포매터가 둘로 갈리나** (`shared/types/primitives.ts` · apiSpec §1.1 · contracts C18).
 * 등락률·수익률(`Percent`)은 **이미 백분율 값**이고, 그 밖의 비율(`Ratio`, 비중 등)은
 * **0~1 소수**다. 예전에는 파라미터가 브랜드 없는 `number`라 어느 쪽이 와도 조용히
 * 통과됐고, 그 자리에서 `ratio * 100`을 걸어 등락률을 100배로 그리는 사고가 났다.
 * 두 함수의 파라미터를 서로 다른 브랜드로 좁혀서 잘못된 계열을 넘기면
 * **컴파일이 막히게** 한다 — 브랜드가 다르면 대입되지 않는다.
 */

/**
 * 이미 백분율인 값(`Percent`: 등락률·수익률)을 부호 붙은 문자열로 바꾼다.
 * **100을 곱하지 않는다.** `-1.21`(Percent) → `-1.21%`
 */
export function formatSignedPercent(
  value: Percent,
  fractionDigits = 2,
): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(fractionDigits)}%`;
}

/**
 * 0~1 사이 소수인 비율(`Ratio`: 비중 등)을 부호 붙은 퍼센트 문자열로 바꾼다.
 * **100을 곱한다.** `0.0123`(Ratio) → `+1.23%`
 */
export function formatSignedRatioAsPercent(
  value: Ratio,
  fractionDigits = 2,
): string {
  const percent = value * 100;
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
