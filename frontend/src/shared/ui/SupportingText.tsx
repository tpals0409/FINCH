import { createElement, type HTMLAttributes } from 'react';

type SupportingTextProps = HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'span' | 'dt' | 'h3';
  size?: 'body' | 'caption';
};

/** 의미가 보조 설명인 문장. 태그는 문서 구조에 맞게 유지한다. */
export function SupportingText({
  as = 'p',
  size = 'body',
  className = '',
  ...props
}: SupportingTextProps) {
  const toneClass =
    size === 'caption' ? 'text-supporting-caption' : 'text-supporting';

  return createElement(as, {
    ...props,
    className: `${toneClass} ${className}`.trim(),
  });
}
