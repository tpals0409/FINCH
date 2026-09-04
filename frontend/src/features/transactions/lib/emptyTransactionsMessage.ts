import type { TransactionFilter } from '@/shared/types/portfolio';

/**
 * 필터별 빈 상태 문구 (와이어프레임 아트보드 12·13 · featureSpec §8).
 *
 * **`ALL` 은 실제로는 이 문구가 쓰이지 않는다.** 계정 생성과 함께 `INITIAL_GRANT` 1건이 반드시
 * 생기므로 `type=ALL` 이 비는 것은 나올 수 없는 상태다 (apiSpec §8.2). 그래도 두는 이유는
 * 서버가 빈 배열을 주는 사고가 났을 때 화면이 아무것도 없이 멈추지 않게 하기 위해서다.
 *
 * 컴포넌트에서 분리한 이유가 둘이다 — MSW 목이 네 필터 전부에 데이터를 심어 이 분기를 화면으로
 * 띄울 수 없어서 순수 함수라야 테스트가 잡고, 컴포넌트 파일이 함수를 함께 내보내면
 * `react-refresh/only-export-components` 가 막는다.
 */
export function emptyTransactionsMessage(filter: TransactionFilter): string {
  switch (filter) {
    case 'DEPOSIT':
      return '충전 내역이 없습니다';
    case 'BUY':
      return '매수 내역이 없습니다';
    case 'SELL':
      return '매도 내역이 없습니다';
    case 'ALL':
      return '내역이 없습니다';
  }
}
