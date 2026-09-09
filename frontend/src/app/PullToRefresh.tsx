import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { pullDistance, shouldRefresh } from './pullGesture';

type PullToRefreshProps = {
  onPullChange?: (distance: number, dragging: boolean) => void;
};

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** WebView의 숨은 pull-to-refresh 대신 진행량과 완료 시점을 화면에 명시한다. */
export function PullToRefresh({
  onPullChange = () => undefined,
}: PullToRefreshProps) {
  const queryClient = useQueryClient();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const start = useRef<{ x: number; y: number } | null>(null);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    function reset() {
      start.current = null;
      distanceRef.current = 0;
      setDistance(0);
      onPullChange(0, false);
    }

    function onTouchStart(event: TouchEvent) {
      if (refreshing || window.scrollY > 0 || event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      if (touch) start.current = { x: touch.clientX, y: touch.clientY };
    }

    function onTouchMove(event: TouchEvent) {
      const origin = start.current;
      const touch = event.touches[0];
      if (!origin || !touch) return;

      const deltaX = Math.abs(touch.clientX - origin.x);
      const deltaY = touch.clientY - origin.y;
      if (deltaY <= 0 || deltaX > deltaY) {
        reset();
        return;
      }

      event.preventDefault();
      distanceRef.current = pullDistance(deltaY);
      setDistance(distanceRef.current);
      onPullChange(reducedMotion ? 0 : distanceRef.current, true);
    }

    function onTouchEnd() {
      if (!start.current) return;
      const refresh = shouldRefresh(distanceRef.current);
      reset();
      if (!refresh) return;

      setRefreshing(true);
      void queryClient
        .refetchQueries({ type: 'active' })
        .finally(() => setRefreshing(false));
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', reset, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, [onPullChange, queryClient, reducedMotion, refreshing]);

  const visible = refreshing || distance > 0;
  const ready = shouldRefresh(distance);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-(--z-overlay) flex justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? Math.max(8, distance) : -48}px)`,
        transition: `opacity var(--motion-fast) var(--finch-timing-function-standard), ${distance > 0 ? 'none' : 'transform var(--motion-fast) var(--finch-timing-function-spring)'}`,
      }}
    >
      <output className="rounded-full border border-stroke-neutral-subtle bg-bg-layer-default px-3 py-2 text-caption text-fg-neutral shadow-sm">
        {refreshing
          ? '새로고침하고 있어요…'
          : ready
            ? '놓으면 새로고침해요'
            : '당겨서 새로고침'}
      </output>
    </div>
  );
}
