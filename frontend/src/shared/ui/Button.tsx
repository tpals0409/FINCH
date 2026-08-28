import { type ComponentProps } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'kakao';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white',
  secondary: 'border border-slate-300 text-slate-700',
  // 카카오 디자인 가이드가 지정한 색이다. 등락 색과 달리 우리가 정하는 값이 아니다.
  kakao: 'bg-[#FEE500] text-[#191600]',
};

/** min-h-11 은 44px 최소 터치 영역이다 (컨벤션 §9). */
const BASE_CLASS =
  'flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium disabled:opacity-50';

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
