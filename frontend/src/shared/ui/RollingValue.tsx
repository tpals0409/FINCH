import { useEffect, useRef } from 'react';

type RollingValueProps = {
  value: string;
  className?: string;
};

/**
 * 시세가 갱신될 때 숫자 전체가 짧게 위에서 굴러온다.
 * Web Animations API의 transform만 사용해 레이아웃을 바꾸지 않으며,
 * reduced-motion 환경에서는 값만 즉시 바꾼다.
 */
export function RollingValue({ value, className = '' }: RollingValueProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const element = valueRef.current;
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (
      element === null ||
      previousValue === value ||
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    ) {
      return;
    }

    const durationValue = getComputedStyle(element)
      .getPropertyValue('--motion-fast')
      .trim();
    const easing =
      getComputedStyle(element)
        .getPropertyValue('--finch-timing-function-standard')
        .trim() || 'ease';
    const duration = Number.parseFloat(durationValue) || 140;

    element.getAnimations?.().forEach((animation) => animation.cancel());
    element.animate(
      [
        { transform: 'translateY(-0.35em)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      {
        duration,
        easing,
      },
    );
  }, [value]);

  return (
    <span ref={valueRef} aria-live="polite" className={className}>
      {value}
    </span>
  );
}
