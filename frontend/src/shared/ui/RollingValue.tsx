import { useEffect, useRef } from 'react';

type RollingValueProps = {
  value: string;
  className?: string;
  numericValue?: number;
  flashClasses?: Partial<Record<'rise' | 'fall', string>>;
};

/**
 * 시세가 갱신될 때 숫자 전체가 짧게 위에서 굴러온다.
 * Web Animations API의 transform과 색상만 사용해 레이아웃을 바꾸지 않으며,
 * reduced-motion 환경에서는 값만 즉시 바꾼다.
 */
export function RollingValue({
  value,
  className = '',
  numericValue,
  flashClasses,
}: RollingValueProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const previousValueRef = useRef(value);
  const previousNumericValueRef = useRef(numericValue);

  useEffect(() => {
    const element = valueRef.current;
    const previousValue = previousValueRef.current;
    const previousNumericValue = previousNumericValueRef.current;
    previousValueRef.current = value;
    previousNumericValueRef.current = numericValue;

    if (
      element === null ||
      previousValue === value ||
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    ) {
      return;
    }

    const computedStyle = getComputedStyle(element);
    const durationValue = computedStyle
      .getPropertyValue('--motion-normal')
      .trim();
    const easing =
      computedStyle
        .getPropertyValue('--finch-timing-function-standard')
        .trim() || 'ease';
    const duration = Number.parseFloat(durationValue) || 200;

    const previousColor = computedStyle.color;
    const flashClass =
      numericValue !== undefined && previousNumericValue !== undefined
        ? numericValue > previousNumericValue
          ? flashClasses?.rise
          : numericValue < previousNumericValue
            ? flashClasses?.fall
            : undefined
        : undefined;
    let flashColor: string | undefined;
    if (flashClass) {
      element.classList.add(flashClass);
      flashColor = getComputedStyle(element).color || undefined;
      element.classList.remove(flashClass);
    }

    element.getAnimations?.().forEach((animation) => animation.cancel());
    const keyframes: Keyframe[] =
      flashColor && previousColor && flashColor !== previousColor
        ? [
            {
              transform: 'translateY(-0.35em)',
              opacity: 0,
              color: flashColor,
            },
            { transform: 'translateY(0)', opacity: 1, color: previousColor },
          ]
        : [
            { transform: 'translateY(-0.35em)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ];
    element.animate(keyframes, {
      duration,
      easing,
    });
  }, [flashClasses, numericValue, value]);

  return (
    <span ref={valueRef} aria-live="polite" className={className}>
      {value}
    </span>
  );
}
