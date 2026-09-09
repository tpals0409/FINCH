import { type ComponentProps, type CSSProperties } from 'react';

import { usePullOffset } from './usePullOffset';

/**
 * 페이지 골격. 모바일 우선으로 만들고 넓은 화면은 중앙 정렬 + 최대 너비 제한으로만
 * 대응한다 (컨벤션 §9).
 *
 * 좌우 여백 20px 은 화면 기본 여백이다. 기준 뷰포트 390px 에서 콘텐츠 폭 350px 이 남는다.
 *
 * 상·하단 여백에 safe-area 를 더하는 이유 — 노치·다이내믹 아일랜드와 홈 인디케이터가
 * 콘텐츠를 가리지 않게 한다. 페이지마다 손으로 적으면 빠뜨린 화면에서만 조용히 어긋난다.
 */
export function PageMain({ className = '', ...props }: ComponentProps<'main'>) {
  const { distance, dragging } = usePullOffset();

  return (
    <main
      {...props}
      style={{ '--finch-pull-distance': `${distance}px` } as CSSProperties}
      className={`mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] [&>header~*]:translate-y-[var(--finch-pull-distance)] ${dragging ? '[&>header~*]:transition-none' : '[&>header~*]:transition-transform [&>header~*]:duration-(--motion-fast) [&>header~*]:ease-spring'} ${className}`}
    />
  );
}
