// DIRECTION: character (S15P21A101-93)

import type { ReactNode } from 'react';

/**
 * 버튼의 세 격. 애플 방향과 이름·의미를 맞춘다 — 어느 방향이 이겨도 호출부가
 * 그대로 살아야 한다.
 *
 * - `solid`  먹 채움 + 크림 글자. 화면의 주 액션 하나에만 쓴다
 * - `tinted` 먹 8% 채움 + 먹 글자. 재시도처럼 되돌릴 수 있는 부차 액션
 * - `plain`  채움 없는 글자 버튼
 */
type ButtonVariant = 'solid' | 'tinted' | 'plain';

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  isDisabled?: boolean;
  /** 폭을 부모에 맞춘다. 하단 고정 바처럼 가로를 채워야 하는 자리. */
  isFullWidth?: boolean;
  ariaLabel?: string;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  /* 채움색이 청색이 아니라 먹이다. 이 방향에는 액센트 청이 없어서, 화면에
     남는 청색이 하락 하나뿐이다. 라이트는 먹 채움 + 크림 글자, 다크는
     크림 채움 + 먹 글자로 뒤집힌다 (토큰 파일 주석 참조). */
  solid:
    'bg-[var(--character-accent-solid)] text-[var(--character-accent-on-solid)] font-semibold',
  /* 먹 8% 채움. 크림 지면 위에서도 흰 카드 위에서도 부모보다 한 단 진해져
     형태가 남는다. 표면색으로 채우면 카드 안에서 카드와 같은 색이 된다. */
  tinted:
    'bg-[color-mix(in_srgb,var(--character-text)_8%,transparent)] text-[var(--character-text)] font-medium',
  plain:
    'text-[var(--character-text)] font-medium underline underline-offset-4',
};

/**
 * 둥근 알약 버튼. 높이는 최소 44px 이다 (컨벤션 §8).
 *
 * 그라데이션을 쓰지 않는다. 채움은 단색 한 겹이고 눌림은 축소 97% 로만 말한다.
 * 캐릭터가 있는 화면이라고 버튼까지 말랑하게 만들면 주문 버튼이 게임 버튼처럼
 * 보인다 — 이 화면에서 가장 무거운 조작이 주문이다.
 */
export function Button({
  children,
  variant = 'tinted',
  onClick,
  isDisabled = false,
  isFullWidth = false,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[0.9375rem] transition-transform duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100 ${
        isFullWidth ? 'w-full' : ''
      } ${VARIANT_CLASS[variant]}`}
    >
      {children}
    </button>
  );
}
