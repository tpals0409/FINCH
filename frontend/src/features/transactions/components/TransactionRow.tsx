import { formatKstHourMinute } from '@/shared/lib/formatDate';
import { formatKrw } from '@/shared/lib/formatNumber';
import { PAYMENT_METHOD_LABEL } from '@/shared/lib/paymentMethod';
import type { Transaction, TransactionType } from '@/shared/types/portfolio';

/**
 * 원장 유형의 표시 이름 (featureSpec §8).
 *
 * 필터 탭의 "충전" 과 같은 문자열이다. `INITIAL_GRANT` 만 필터에 없고 `ALL` 에서만 보인다.
 */
const TYPE_LABEL: Record<TransactionType, string> = {
  INITIAL_GRANT: '초기 지급',
  DEPOSIT: '충전',
  BUY: '매수',
  SELL: '매도',
};

/**
 * 예수금이 드는 유형과 나는 유형. `amount` 는 항상 양수로 오므로(서버가 `abs(cash_delta)`)
 * 부호는 유형에서 만든다.
 */
const OUTFLOW_TYPES: readonly TransactionType[] = ['BUY'];

/**
 * 매매 내역 한 줄 (apiSpec §8.2 · 와이어프레임 아트보드 10~11).
 *
 * **금액에 등락 색을 쓰지 않는다.** `+`/`−` 는 원장 유입·유출을 뜻할 뿐 시세 방향이 아니다.
 * 부호가 방향을 말하고 색은 잉크다 — 여기에 up/down 을 칠하면 매수가 늘 파랗게 보인다.
 *
 * ⚠️ **체결 건(`BUY`·`SELL`)은 이번 스프린트에 오지 않는다.** 주문 기능이 없어 `trade` 가
 * 0행이고, 서버 조회도 아직 `trade` 를 조인하지 않아 종목·수량·체결가가 전부 `null` 이다
 * (백엔드 `LedgerEntryRepository.findPage` 주석). 그래도 이 분기를 만들어 두는 이유는
 * 응답 스키마가 11필드로 이미 고정이라서다 — 주문 스프린트가 값만 채우면 된다.
 */
type Props = { transaction: Transaction };

export function TransactionRow({ transaction }: Props) {
  const sign = OUTFLOW_TYPES.includes(transaction.type) ? '−' : '+';

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-body-2 text-fg-neutral">
          {TYPE_LABEL[transaction.type]}
        </p>
        <p className="mt-0.5 truncate text-caption text-fg-neutral-subtle">
          {formatKstHourMinute(transaction.occurredAt)} ·{' '}
          {describe(transaction)}
        </p>
      </div>

      <p className="shrink-0 text-body-2 text-fg-neutral">
        {sign}
        {formatKrw(transaction.amount)}
      </p>
    </li>
  );
}

/**
 * 행의 부제. 유형마다 채워지는 필드가 다르다 — 충전은 결제 수단, 체결은 종목과 수량,
 * 초기 지급은 둘 다 없어 사건 자체를 적는다.
 *
 * `null` 을 그대로 그리지 않기 위한 분기다. 키가 빠지는 것이 아니라 `null` 로 오므로
 * (contracts C 참고) 옵셔널 체이닝만으로는 "null" 문자열이 화면에 뜬다.
 */
function describe(transaction: Transaction): string {
  if (transaction.type === 'INITIAL_GRANT') {
    return '계정 생성';
  }

  if (transaction.type === 'DEPOSIT') {
    return transaction.paymentMethod === null
      ? '모의 결제'
      : PAYMENT_METHOD_LABEL[transaction.paymentMethod];
  }

  const name = transaction.stockName ?? transaction.stockCode ?? '종목';
  return transaction.quantity === null
    ? name
    : `${name} ${transaction.quantity.toLocaleString('ko-KR')}주`;
}
