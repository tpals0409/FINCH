// DIRECTION: character (S15P21A101-93)

import type { ReactNode } from 'react';

type SpeechBubbleProps = {
  children: ReactNode;
};

/**
 * 새가 하는 말 한 마디.
 *
 * **이 안에 숫자를 처음 등장시키지 않는다.** 말풍선은 이미 화면에 있는 값을
 * 한국어 문장으로 한 번 더 말하는 자리다. 여기서만 볼 수 있는 수치를 넣으면
 * 사용자가 캐릭터 말풍선을 정보원으로 삼게 되고, 그러면 장식이 정보가 된다.
 *
 * 문장은 짧게 둔다. 세 줄을 넘기면 말풍선이 표제부의 절반을 먹고 현재가가
 * 화면 밖으로 밀린다.
 *
 * `break-keep` 을 건다. 기본값으로 두면 좁은 폭에서 `아직 이/익 구간` 처럼
 * 한글 단어 한가운데가 잘린다. 이 말풍선은 폭이 가장 좁은 활자 덩어리라
 * 화면에서 그 사고가 가장 먼저 나는 자리다.
 */
export function SpeechBubble({ children }: SpeechBubbleProps) {
  return (
    <p className="character-bubble px-3.5 py-2.5 text-[0.9375rem] leading-[1.45] font-medium break-keep text-[var(--character-text)]">
      {children}
    </p>
  );
}
