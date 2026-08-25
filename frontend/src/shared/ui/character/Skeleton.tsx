// DIRECTION: character (S15P21A101-93)

type SkeletonProps = {
  className?: string;
};

/**
 * 로딩 자리표시자 (컨벤션 §7). props 는 애플 방향과 같다.
 *
 * 스피너 대신 실제 레이아웃과 같은 크기를 차지해 레이아웃이 흔들리지 않게 한다.
 * 채움색은 토큰에서 온다 — 원색 팔레트를 쓰면 다크에서 밝은 회색 덩어리가
 * 어두운 지면에 남는다.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--character-text-muted)_16%,transparent)] ${className}`}
      aria-hidden="true"
    />
  );
}
