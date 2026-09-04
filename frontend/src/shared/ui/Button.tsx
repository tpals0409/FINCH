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
 *
 * 트랜지션이 `transition-colors` 가 아닌 이유 (컨벤션 §12.2·§12.9). 그 유틸리티의
 * property 목록에 `color` 와 `outline-color` 가 들어 있다.
 * - `outline-color` → 전역 포커스 링이 140ms 페이드인한다. 늦게 따라오는 링은 고장으로 느껴진다
 * - `color` → 시세를 자기 자신에 갖는 요소를 이걸로 만들면 fg-up ↔ fg-down 이 보간되고
 *   중간에 무채색을 지나 그 프레임 동안 보합으로 읽힌다
 * 눌림·호버가 실제로 바꾸는 건 면과 테두리뿐이라 좁혀도 잃는 게 없다.
 *
 * 비활성으로 넘어갈 때만 0ms 인 이유 — 비활성은 상태 변화가 아니라 사실이다. 흐려지는 중인
 * 제출 버튼은 아직 누를 수 있는 것처럼 보이고, 충전·주문 화면에서 그 프레임에 한 번 더 눌리면
 * 중복 요청이다. 트랜지션은 **변화 후 스타일**의 값을 쓰므로 활성 → 비활성에서 0ms 가 적용된다.
 *
 * `not-disabled:transition-*` 이 아니라 `disabled:duration-0` 인 이유. 앞의 것은 비활성일 때
 * transition-property 선언이 통째로 빠져 CSS 초기값 `all` 로 되돌아간다. duration 은 남아 있어서
 * 결과가 140ms `transition-all` 이다 — 컨벤션 §12.2 가 금지한 그것이 실수로 만들어진다.
 */
const BASE_CLASS =
  'flex min-h-[54px] w-full items-center justify-center gap-2 rounded-md px-4 text-label ' +
  'transition-[background-color,border-color] duration-(--motion-fast) ease-standard disabled:duration-0 ' +
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
