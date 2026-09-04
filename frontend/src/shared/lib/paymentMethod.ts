import type { PaymentMethod } from '@/shared/types/deposit';

/**
 * 결제 수단 표시 이름 (featureSpec §3.2).
 *
 * `shared` 에 두는 이유 — 충전 화면과 매매 내역이 둘 다 쓰는데 feature 끼리는 import 하지
 * 않는다 (컨벤션: 의존 방향 `app → pages → features → shared` 단방향).
 *
 * 서버가 문구를 완성해 주는 에러 `message` 와 달리 이것은 **enum 값의 표시 이름**이라
 * 화면 쪽에 있다. 서버는 `VIRTUAL_CARD` 를 주지 "가상 카드" 를 주지 않는다.
 */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  VIRTUAL_CARD: '가상 카드',
  VIRTUAL_TRANSFER: '가상 계좌이체',
};
