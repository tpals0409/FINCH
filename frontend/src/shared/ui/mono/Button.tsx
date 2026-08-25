// DIRECTION: mono (S15P21A101-95)

import type { ReactNode } from 'react';

/**
 * 버튼의 세 격. 채움은 화면당 하나여야 하므로 격을 이름으로 구분해 둔다.
 *
 * - `solid`  먹 채움 + 반전 글자. 화면의 주 액션 하나에만 쓴다
 * - `tinted` 떠오른 면. 재시도처럼 되돌릴 수 있는 부차 액션
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
  solid: 'mono-button-solid',
  tinted: 'mono-button-tinted',
  plain: 'mono-button-plain',
};

/**
 * 알약 버튼.
 *
 * **채움을 청색으로 하지 않는다.** 이 방향의 캐릭터가 무채색이라 화면에서
 * 적색과 청색이 오직 등락에만 쓰인다. 조작에 청색을 도입하는 순간 그 이점이
 * 사라진다. 주 버튼은 넥타이 색 계열의 먹남색이고, 다크에서는 같은 자리를
 * 흰색이 맡는다 — 어두운 지면 위에서 먹남색은 형태가 남지 않는다.
 *
 * 부차 버튼(`tinted`)은 지면에서 떠오른 면이다. 캐릭터가 3D 라서 버튼도
 * 만질 수 있어 보여야 한다. 다만 그림자는 얕게 둔다 — 두꺼운 테두리나 강한
 * 엠보싱으로 가면 촌스러워진다.
 *
 * 높이는 최소 44px 이다 (터치 대상).
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
      className={`mono-button ${VARIANT_CLASS[variant]}`}
      style={isFullWidth ? { width: '100%' } : undefined}
    >
      {children}
    </button>
  );
}
