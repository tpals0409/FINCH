import NumberFlow, { type Format } from '@number-flow/react';
import { useEffect, useRef } from 'react';

import { parseCssDuration } from '@/shared/lib/parseCssDuration';

type RollingValueProps = {
  value: string;
  numericValue: number;
  format?: Format;
  prefix?: string;
  suffix?: string;
  className?: string;
  flashClasses?: Partial<Record<'rise' | 'fall', string>>;
};

/**
 * 시세가 갱신될 때 변경된 숫자 자릿수만 굴러온다.
 * NumberFlow가 숫자 포맷과 자릿수별 전환을 담당하고, 방향 색상은 짧게 감쇠한다.
 * reduced-motion 환경에서는 NumberFlow와 색상 효과 모두 즉시 값을 표시한다.
 */
export function RollingValue({
  value,
  numericValue,
  format,
  prefix,
  suffix,
  className = '',
  flashClasses,
}: RollingValueProps) {
  const flashRef = useRef<HTMLSpanElement>(null);
  const previousValueRef = useRef(numericValue);

  useEffect(() => {
    const element = flashRef.current;
    const previousValue = previousValueRef.current;
    previousValueRef.current = numericValue;

    if (
      element === null ||
      previousValue === numericValue ||
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    ) {
      return;
    }

    const computedStyle = getComputedStyle(element);
    const duration = parseCssDuration(
      computedStyle.getPropertyValue('--motion-sheet').trim(),
    );
    const easing =
      computedStyle
        .getPropertyValue('--finch-timing-function-standard')
        .trim() || 'ease';
    const flashClass =
      numericValue > previousValue
        ? flashClasses?.rise
        : numericValue < previousValue
          ? flashClasses?.fall
          : undefined;

    if (flashClass === undefined) {
      return;
    }

    const previousColor = computedStyle.color;
    element.classList.add(flashClass);
    const flashColor = getComputedStyle(element).color;
    element.classList.remove(flashClass);

    if (
      previousColor === '' ||
      flashColor === '' ||
      previousColor === flashColor
    ) {
      return;
    }

    element.getAnimations?.().forEach((animation) => animation.cancel());
    element.animate([{ color: flashColor }, { color: previousColor }], {
      duration,
      easing,
    });
  }, [flashClasses, numericValue]);

  return (
    <span
      ref={flashRef}
      aria-label={value}
      aria-live="polite"
      className={className}
    >
      <NumberFlow
        format={format}
        locales="ko-KR"
        prefix={prefix}
        suffix={suffix}
        value={numericValue}
      />
    </span>
  );
}
