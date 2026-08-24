type SkeletonProps = {
  className?: string;
};

/**
 * 로딩 자리표시자 (컨벤션 §7).
 *
 * 스피너 대신 실제 레이아웃과 같은 크기를 차지해 레이아웃이 흔들리지 않게 한다.
 * 크기는 쓰는 쪽이 className 으로 정한다.
 *
 * 채움색은 토큰에서 온다. 원색 팔레트(`bg-slate-200`)를 쓰면 다크 모드에서
 * 밝은 회색 덩어리가 검은 지면에 남는다.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-text-muted/15 ${className}`}
      aria-hidden="true"
    />
  );
}
