import type { Candle, CandlePeriod } from '../model/stockDetail';

/**
 * 목 일봉 생성기.
 *
 * **여기서 나오는 값은 전부 지어낸 것이다.** MSW 핸들러(0-11)가 아직 없어서
 * 화면을 세우기 위해 만든 자리표시자다. 실제 시세는 백엔드가 KIS 에서 받아온다.
 *
 * `Math.random` 을 쓰지 않는다. 새로고침마다 도판 모양이 바뀌면 디자인을
 * 눈으로 검토할 수 없고, 스크린샷 비교도 못 한다. 종목코드에서 씨를 뽑아
 * 선형 합동 생성기로 같은 입력에 같은 캔들이 나오게 고정한다.
 */

const PERIOD_TRADING_DAYS: Record<CandlePeriod, number> = {
  '1M': 21,
  '3M': 62,
  '1Y': 248,
};

/** 마지막 봉은 목 종목 상세의 시세와 맞춘다. 두 화면 요소가 어긋나면 바로 눈에 띈다. */
const LAST_CANDLE: Omit<Candle, 'date'> = {
  open: 74_200,
  high: 74_500,
  low: 73_100,
  close: 73_500,
  volume: 12_345_678,
};

/** 선형 합동 생성기. 값의 품질은 중요하지 않고 재현성만 중요하다. */
function createRandom(seed: number): () => number {
  let state = seed % 2_147_483_647;
  if (state <= 0) {
    state += 2_147_483_646;
  }
  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
}

function toSeed(text: string): number {
  let seed = 7;
  for (const character of text) {
    seed = (seed * 31 + character.codePointAt(0)!) % 2_147_483_647;
  }
  return seed;
}

/** KST 자정 기준으로 영업일(월~금)만 거꾸로 세어 날짜 문자열을 만든다. */
function createTradingDates(endDate: Date, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(endDate);

  while (dates.length < count) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return dates.reverse();
}

export function createMockCandles(
  stockCode: string,
  period: CandlePeriod,
  lastTradingDay: string,
): Candle[] {
  const count = PERIOD_TRADING_DAYS[period];
  const dates = createTradingDates(
    new Date(`${lastTradingDay}T00:00:00Z`),
    count,
  );
  const random = createRandom(toSeed(`${stockCode}:${period}`));

  // 마지막 종가에서 거꾸로 걸어 올라가며 앞의 봉을 만든다.
  // 앞에서부터 만들면 마지막 값이 목 시세와 맞지 않는다.
  const closes: number[] = [LAST_CANDLE.close];
  for (let index = 1; index < count; index += 1) {
    const drift = (random() - 0.48) * 0.022;
    const previous = closes[0]!;
    closes.unshift(Math.round(previous / (1 + drift) / 10) * 10);
  }

  return dates.map((date, index) => {
    if (index === count - 1) {
      return { date, ...LAST_CANDLE };
    }

    const close = closes[index]!;
    const open = index === 0 ? close : closes[index - 1]!;
    const spread = Math.round(close * (0.004 + random() * 0.012));
    return {
      date,
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      close,
      volume: Math.round(6_000_000 + random() * 14_000_000),
    };
  });
}
