import type { ReactNode } from 'react';

/**
 * 버튼의 세 격. 채움은 화면당 하나여야 하므로 격을 이름으로 구분해 둔다.
 *
 * - `solid`  액센트 청 채움 + 흰 글자. 화면의 주 액션 하나에만 쓴다
 * - `tinted` 표면 채움 + 먹 글자. 재시도처럼 되돌릴 수 있는 부차 액션
 * - `plain`  채움 없는 글자 버튼. 목록 안이나 카드 안의 가벼운 조작
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

/**
 * 애플 알약 버튼 (`radius-full` 980px).
 *
 * 그라데이션을 쓰지 않는다. 채움은 단색 한 겹이고, 눌림은 축소 97% 로만
 * 말한다 — 그림자를 움직이면 버튼이 떠 있는 물체처럼 보이고, 이 화면에서
 * 떠 있는 것은 하단 고정 바뿐이어야 한다.
 *
 * 높이는 최소 44px 이다 (컨벤션 §8, 애플 HIG 터치 대상).
 *
 * `solid` 의 채움은 라이트·다크 양쪽에서 #0071E3 로 고정한다. 다크 액센트
 * #2997FF 위에 흰 글자를 얹으면 3.02:1 로 기준 미달이기 때문이다 (토큰 주석 (2)).
 */
export function Button({
  children,
  variant = 'tinted',
  onClick,
  isDisabled = false,
  isFullWidth = false,
  ariaLabel,
}: ButtonProps) {
  const variantClass: Record<ButtonVariant, string> = {
    solid:
      'bg-accent-solid text-accent-on-solid font-semibold hover:brightness-110',
    // 채움을 먹의 8% 로 둔다. 지면(#FFFFFF/#000000) 위에서도 카드 표면
    // (#F5F5F7/#1C1C1E) 위에서도 부모보다 한 단 진해져 형태가 남는다.
    // `bg-surface` 로 두면 카드 안에서 카드와 같은 색이라 테두리만 남는다.
    tinted: 'bg-text/8 text-text font-medium',
    plain: 'text-accent font-medium',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-6 text-note transition-transform duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100 ${
        isFullWidth ? 'w-full' : ''
      } ${variantClass[variant]}`}
    >
      {children}
    </button>
  );
}
