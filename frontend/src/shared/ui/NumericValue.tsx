import { createElement, type HTMLAttributes } from 'react';

type NumericValueProps = HTMLAttributes<HTMLElement> & {
  as?: 'dd' | 'span' | 'output';
};

/** 표와 정의 목록에서 오른쪽 정렬되는 숫자 값. */
export function NumericValue({
  as = 'dd',
  className = '',
  ...props
}: NumericValueProps) {
  return createElement(as, {
    ...props,
    className: `numeric-value ${className}`.trim(),
  });
}
