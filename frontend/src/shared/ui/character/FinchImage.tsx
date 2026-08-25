// DIRECTION: character (S15P21A101-93)

/**
 * 두 마리 중 누구인가. 핑치는 분홍, 블루치는 파랑이고 그 밖의 차이는 없다.
 * 형태·표정·포즈·크기·자리가 전부 같고 몸 색만 바뀐다.
 */
export type FinchBird = 'pinchi' | 'bluechi';

/**
 * 쓰는 포즈. `public/character/` 에 잘라 둔 것만 여기 적는다.
 * 시트에는 15종이 있지만 이 화면이 쓰는 것은 넷이다 — 필요 없는 것을 미리
 * 잘라 두면 번들에 안 쓰는 그림이 쌓인다.
 */
export type FinchPose = 'search' | 'think' | 'analyze' | 'idea';

type FinchImageProps = {
  bird: FinchBird;
  pose: FinchPose;
  /** CSS 높이. 폭은 그림 비율을 따른다. */
  height: string;
  className?: string;
};

/**
 * 잘라낸 캐릭터 PNG 한 장.
 *
 * **장식이다. 정보가 아니다.** 그래서 `alt=""` 로 두고 스크린 리더에서 지운다.
 * 등락은 색 + 부호 + 삼각형이 말하고 새는 그 위에 얹히는 분위기일 뿐이다.
 * 새에게 "상승"이라는 alt 를 달면 같은 사실을 두 번 읽어 주게 되고, 더 나쁘게는
 * 새가 등락의 신호라고 말하는 셈이 된다 — 그러면 안 된다.
 *
 * 핑치와 블루치 파일은 **같은 캔버스 크기로 잘라 두었다.** 두 파일의 고유 비율이
 * 다르면 상승/하락을 오갈 때 새가 미세하게 커졌다 작아지고 옆 활자가 밀린다.
 * 자른 방법은 `_design-refs` 옆의 작업 기록에 있다.
 *
 * `width`/`height` 속성을 함께 준다. 없으면 그림이 도착하기 전까지 높이가 0 이라
 * 표제부가 통째로 밀렸다가 자리를 잡는다.
 */
export function FinchImage({
  bird,
  pose,
  height,
  className = '',
}: FinchImageProps) {
  return (
    <img
      src={`/character/${bird}-${pose}.png`}
      alt=""
      aria-hidden="true"
      width={339}
      height={312}
      draggable={false}
      className={`w-auto max-w-full object-contain select-none ${className}`}
      style={{ height }}
    />
  );
}
