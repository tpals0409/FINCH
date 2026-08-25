// DIRECTION: mono (S15P21A101-95)

type SkeletonProps = {
  className?: string;
};

/**
 * 로딩 자리표시자.
 *
 * 스피너 대신 실제 레이아웃과 같은 크기를 차지해 레이아웃이 흔들리지 않게 한다.
 * 크기는 쓰는 쪽이 className 으로 정한다.
 *
 * 이 방향의 자리표시자는 **떠오르지 않는다.** 아직 값이 없는 자리에 그림자를
 * 주면 빈 카드가 실물처럼 보이고, 값이 도착하는 순간 두 번 뜨는 것처럼 읽힌다.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`mono-skeleton ${className}`} aria-hidden="true" />;
}
