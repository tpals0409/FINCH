import { type ComponentProps } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'kakao';

/**
 * 색·높이·반경은 모두 토큰이다 (styles/tokens.css 의 SEED 층, styles/index.css 의 별칭 층).
 * primary 는 브랜드 액센트가 아니라 잉크 채움이다 — Finch 의 브랜드는 색이 아니라 잉크의 무게다.
 */
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-bg-neutral-solid text-fg-neutral-inverted',
  secondary:
    'border border-stroke-neutral-weak bg-bg-layer-default text-fg-neutral',
  // 카카오 디자인 가이드가 지정한 색이다. 등락 색과 달리 우리가 정하는 값이 아니다.
  kakao: 'bg-[#FEE500] text-[#191600]',
};

/**
 * 높이 54px 는 최소 터치 영역 44px 를 넘기고 주요 CTA 로도 충분한 크기다. 반경은 --radius-md(14px).
 *
 * 비활성은 opacity 가 아니라 전용 색을 쓴다. opacity 는 자식 아이콘·스피너까지
 * 함께 흐려져 로딩 표시가 사라진다.
 */
const BASE_CLASS =
  'flex min-h-[54px] w-full items-center justify-center gap-2 rounded-md px-4 text-label ' +
  'transition-colors duration-(--motion-fast) ease-standard ' +
  'disabled:bg-bg-disabled disabled:text-fg-disabled disabled:border-transparent';

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`}
    />
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={`${BASE_CLASS} ${VARIANT_CLASS[variant]} ${className}`}
    />
  );
}
