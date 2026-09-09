import { useEffect, useRef } from 'react';

/**
 * 무한 스크롤 감지기. `IntersectionObserver` 는 플랫폼 기본 기능이라 라이브러리를 더하지 않는다.
 * 스크롤 이벤트로 만들지 않아 빠른 스크롤에서도 마지막 페이지를 놓치지 않는다.
 */
export function useInfiniteScroll({
  enabled,
  onReach,
}: {
  enabled: boolean;
  onReach: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // 최신 콜백을 참조로 들고 있어 observer 를 매 렌더 다시 만들지 않는다.
  const onReachRef = useRef(onReach);

  useEffect(() => {
    onReachRef.current = onReach;
  });

  useEffect(() => {
    const node = ref.current;
    if (!enabled || node === null) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onReachRef.current();
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
