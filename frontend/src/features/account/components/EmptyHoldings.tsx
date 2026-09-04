import { Card } from '@/shared/ui/Card';

/**
 * 보유 종목 없음 (와이어프레임 아트보드 1).
 *
 * **이것이 이번 스프린트의 정상 화면이다.** 주문 기능이 없어 보유가 생길 경로 자체가 없고,
 * `holding`·`price` 도메인도 아직 없다. 예외 상태로 그리지 않는 이유가 그것이다.
 *
 * "종목 매수하기" 버튼을 두지 않는다 — 주문 화면이 없어 눌러도 갈 곳이 없다.
 */
export function EmptyHoldings() {
  return (
    <Card className="text-center">
      <p className="text-body-1 text-fg-neutral">보유 중인 종목이 없습니다</p>
      <p className="mt-1 text-caption text-fg-neutral-subtle">
        종목을 매수하면 평가금액과 함께 여기에 표시됩니다
      </p>
    </Card>
  );
}
