import { type ComponentProps } from 'react';

/**
 * 페이지 골격. 모바일 우선으로 만들고 넓은 화면은 중앙 정렬 + 최대 너비 제한으로만
 * 대응한다 (컨벤션 §9).
 *
 * 좌우 여백 20px 은 design.md §5 Screen Margin 이 정한 모바일 기본값이다.
 *
 * 하단 여백에 safe-area 를 더하는 이유 — 홈 인디케이터가 있는 기기에서 마지막 버튼이
 * 그 밑에 깔린다. 페이지마다 손으로 적으면 빠뜨린 화면에서만 조용히 어긋난다.
 */
export function PageMain({ className = '', ...props }: ComponentProps<'main'>) {
  return (
    <main
      {...props}
      className={`mx-auto w-full max-w-md px-5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ${className}`}
    />
  );
}
