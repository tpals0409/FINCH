import { type ComponentProps } from 'react';

/**
 * 표준 카드. 흰 면 + 1px 테두리 + radius-card + 안쪽 여백 20px. 그림자는 쓰지 않는다.
 *
 * 테두리가 stroke-neutral-weak 인 이유 — 흰 카드는 paper 배경 위에서 대비가 0 이라
 * 면색만으로는 카드 경계가 생기지 않는다. 테두리가 유일한 경계이므로 한 단계 진한 쪽을 쓴다.
 */
export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section
      {...props}
      className={`rounded-card border border-stroke-neutral-weak bg-bg-layer-default p-5 ${className}`}
    />
  );
}
