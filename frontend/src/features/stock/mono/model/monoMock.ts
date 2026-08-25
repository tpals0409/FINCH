// DIRECTION: mono (S15P21A101-95)

import type { StockDetail } from '../../model/stockDetail';

/**
 * 목 시세 강제. **개발 빌드에서만 읽는다.**
 *
 * 이 방향의 캐릭터는 등락 부호를 따라 포즈가 바뀐다. 그런데 92 의 목 데이터는
 * 상태가 하나뿐이라(당일 -1.21%, 평가손익 +27,600원) 세 포즈 중 하나만 볼 수 있다.
 * 92 의 목을 고칠 수는 없으므로 — 시안끼리는 한 글자도 건드리지 않는다 —
 * 받아온 값을 이쪽에서 다시 계산해 세 상태를 다 보이게 한다.
 *
 * MSW 핸들러가 들어오면 이 파일과 `?state` 파라미터는 함께 사라진다.
 */
export const MOCK_PRICE_STATES = ['rise', 'fall', 'flat'] as const;
export type MockPriceState = (typeof MOCK_PRICE_STATES)[number];

export type MonoMockOverride = {
  /** 지정하지 않으면 92 의 목 값을 그대로 쓴다. */
  priceState?: MockPriceState;
  /** 미보유 화면을 보기 위한 스위치. `?holding=none` */
  hidesHolding: boolean;
};

/**
 * 상태마다 당일 등락과 평가손익의 **부호를 맞춰 둔다.**
 *
 * 부호가 어긋난 조합(당일은 내렸는데 평가손익은 이익)이 실제로 흔하고, 그 경우
 * 어느 쪽을 따르는지가 이 방향의 판단 규칙이다. 그 조합은 파라미터 없이 들어왔을
 * 때(92 의 목 그대로) 그대로 볼 수 있으므로 여기서 또 만들지 않는다.
 *
 * 평균 단가 71,200원 · 12주는 92 의 목과 같게 두고 현재가만 옮긴다.
 *   rise  (76,300 − 71,200) × 12 =  61,200 / 5,100 ÷ 71,200 =  +7.16%
 *   fall  (68,700 − 71,200) × 12 = −30,000 / −2,500 ÷ 71,200 = −3.51%
 *   flat  평균 단가를 현재가에 맞춰 손익 0 으로 둔다
 */
const PRICE_STATE: Record<
  MockPriceState,
  {
    currentPrice: number;
    previousClose: number;
    changeAmount: number;
    changeRate: number;
    avgBuyPrice: number;
    evaluationProfit: number;
    evaluationProfitRate: number;
  }
> = {
  rise: {
    currentPrice: 76_300,
    previousClose: 74_400,
    changeAmount: 1_900,
    changeRate: 2.55,
    avgBuyPrice: 71_200,
    evaluationProfit: 61_200,
    evaluationProfitRate: 7.16,
  },
  fall: {
    currentPrice: 68_700,
    previousClose: 74_400,
    changeAmount: -5_700,
    changeRate: -7.66,
    avgBuyPrice: 71_200,
    evaluationProfit: -30_000,
    evaluationProfitRate: -3.51,
  },
  flat: {
    currentPrice: 74_400,
    previousClose: 74_400,
    changeAmount: 0,
    changeRate: 0,
    avgBuyPrice: 74_400,
    evaluationProfit: 0,
    evaluationProfitRate: 0,
  },
};

export function applyMonoMockOverride(
  detail: StockDetail,
  override: MonoMockOverride,
): StockDetail {
  const next: StockDetail =
    override.priceState === undefined
      ? detail
      : (() => {
          const preset = PRICE_STATE[override.priceState];
          return {
            ...detail,
            currentPrice: preset.currentPrice,
            previousClose: preset.previousClose,
            changeAmount: preset.changeAmount,
            changeRate: preset.changeRate,
            holding:
              detail.holding === null
                ? null
                : {
                    ...detail.holding,
                    avgBuyPrice: preset.avgBuyPrice,
                    evaluationProfit: preset.evaluationProfit,
                    evaluationProfitRate: preset.evaluationProfitRate,
                  },
          };
        })();

  return override.hidesHolding ? { ...next, holding: null } : next;
}
