// DIRECTION: character (S15P21A101-93)

import { useSearchParams } from 'react-router-dom';

import type { FinchBird } from '@/shared/ui/character/FinchImage';

import { useStockDetail } from '../api/useStockDetail';

/**
 * 이 화면에 설 새를 고른다. 상승이면 핑치(분홍), 하락이면 블루치(파랑)다.
 *
 * ── 무엇을 보고 정하는가 ────────────────────────────────────────────────────
 *
 * 사용자가 정한 것은 "예수금 기준 상승장이면 핑치, 하락이면 블루치" 하나뿐이고,
 * 종목 상세 화면에서 그것이 어떤 값인지는 정해지지 않았다. **아래는 가정이다.**
 *
 *   1. 그 종목을 **보유 중이면** 평가손익의 부호를 따른다 (+ 핑치 / − 블루치)
 *   2. **미보유면** 그 종목의 당일 등락 부호를 따른다
 *   3. 어느 쪽도 0 이거나 아직 데이터가 없으면 핑치를 쓴다
 *
 * 보유를 우선하는 이유는 "예수금 기준"이라는 말이 내 계좌 기준이라는 뜻으로
 * 읽히기 때문이다. 내 돈이 아직 플러스인데 오늘 시세가 빠졌다고 새가 파랗게
 * 변하면, 사용자는 새가 시세를 말하는지 내 손익을 말하는지 알 수 없게 된다.
 * 그래서 말풍선도 **새를 정한 바로 그 값**을 문장으로 말한다 (`StockQuoteHeader`).
 *
 * 이 가정이 틀렸다면 고칠 곳은 이 함수 하나다.
 *
 * ── 개발용 강제 ─────────────────────────────────────────────────────────────
 *
 * 목 데이터로는 한쪽 새밖에 볼 수 없다. 두 상태를 눈으로 비교할 수단이 없으면
 * 만들어도 확인이 안 되므로, 개발 빌드에서만 `?mood=pinchi|bluechi` 로 덮을 수
 * 있게 뒀다. 애플 방향이 AI 상태를 `?aiState=` 로 강제해 둔 것과 같은 장치다.
 * MSW 핸들러와 실제 응답이 붙으면 사라진다.
 */
export function useFinchMood(stockCode: string): FinchBird {
  const { data } = useStockDetail(stockCode);
  const [searchParams] = useSearchParams();

  if (import.meta.env.DEV) {
    const forced = searchParams.get('mood');
    if (forced === 'pinchi' || forced === 'bluechi') {
      return forced;
    }
  }

  if (data === undefined) {
    return 'pinchi';
  }

  const signal =
    data.holding === null ? data.changeRate : data.holding.evaluationProfit;

  return signal < 0 ? 'bluechi' : 'pinchi';
}
