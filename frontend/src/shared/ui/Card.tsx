import { type ComponentProps } from 'react';

/**
 * Standard Card (design.md §6.2).
 * 흰 면 + 1px 테두리 + 반경 16px + 안쪽 여백 20px. 그림자는 쓰지 않는다.
 */
export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section
      {...props}
      className={`rounded-card border border-border bg-surface p-5 ${className}`}
    />
  );
}
