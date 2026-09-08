import { createElement, type HTMLAttributes } from 'react';

type SeparatedGroupProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'dl';
};

/** 앞 내용과 구분선으로 나뉜 세로 정보 묶음. */
export function SeparatedGroup({
  as = 'div',
  className = '',
  ...props
}: SeparatedGroupProps) {
  return createElement(as, {
    ...props,
    className: `separated-group ${className}`.trim(),
  });
}
