# FINCH SEED

앱의 디자인 토큰 체계다. 당근 SEED 를 옮긴 것이고 원본 방법론은
`~/Desktop/발표자료/계획/Design.md`, 값의 출처는 발표자료(FINCH-presentation)의
`styles/tokens.css` 다.

**이 문서에 값을 적지 않는다.** 값은 `frontend/src/styles/tokens.css` 에만 있다.
여기 적는 것은 구조와 규칙, 그리고 템플릿에서 벗어난 자리의 이유다.

원본 템플릿은 869줄이다. 그걸 통째로 옮기면 아무도 안 읽고, 우리가 지키지 않는 항목이
문서 안에서 거짓말로 남는다. 그래서 실제로 만든 것만 적는다.

---

## 1. 두 파일, 두 층

```
frontend/src/styles/
├─ tokens.css   :root — SEED 토큰 (--finch-*). palette → 역할 → 타이포·반경·모션·깊이
└─ index.css    @import · @font-face · @theme static 별칭 층 · reset/body
```

`main.tsx` 는 `index.css` 하나만 import 하고, `index.css` 가 `tokens.css` 를 `@import` 한다.

| 층 | 사는 곳 | 하는 일 |
|---|---|---|
| **Palette** | `tokens.css` | 사다리. 값을 직접 적는 유일한 곳 |
| **역할** | `tokens.css` | 팔레트 별칭. `fg` / `bg` / `stroke` × role × variant × state |
| **별칭** | `index.css` `@theme static` | 역할 토큰 중 유틸리티로 열 것만 Tailwind 네임스페이스로 옮겨 적기 |

이름은 `--finch-{type}-{category}-{name}` (Design.md §2). 색 역할 토큰은
Property(fg/bg/stroke) · Role · Variant(solid/weak/subtle/contrast/inverted/alpha) · State(-pressed/-selected).

### 별칭 층의 규칙

**팔레트는 절대 별칭에 올리지 않는다.** 올리면 Tailwind 가 `text-palette-gray-700`
유틸리티를 만들고, 존재하는 유틸리티는 언젠가 쓰인다. 그러면 "토큰 밖 색을 쓰지 않는다"는
규칙이 우리 팔레트 안에서 되살아난다.

**역할 토큰도 전부 올리지 않는다.** 별칭 층은 의도적으로 좁은 문이다. 지금 컴포넌트가
실제로 쓰는 것만 손으로 적혀 있고, `tokens.css` 에는 있지만 별칭에 없는 토큰이 더 많다
(pressed · selected · overlay · critical · vivid · up/down 면 · contrast 획).
필요해질 때 한 줄씩 연다.

**별칭 이름은 SEED 역할 이름 그대로다.** `--finch-color-fg-neutral` → `--color-fg-neutral`.
property 세그먼트를 남기는 이유는 Tailwind 의 `--color-*` 네임스페이스가 `bg-` · `text-` ·
`border-` 세 유틸리티에 동시에 열려 있어서다. 이름이 property 를 말해야
"fg 를 배경에 쓰지 않는다"(Design.md §4.6)가 눈으로도 grep 으로도 잡힌다.
대가로 `bg-bg-layer-default` 처럼 겹쳐 읽힌다. 겹침이 싫어서 `bg-` 를 떼면
`bg-neutral`(=잉크)이 배경으로 읽히는 함정이 생긴다. 겹침 쪽을 택했다.

**`@theme static` 의 `static` 을 떼지 않는다.** Tailwind v4 는 유틸리티가 쓰지 않는
테마 변수를 빌드에서 지운다. 그러면 아직 아무도 안 쓴 토큰을 손으로 쓴 CSS 에서
`var()` 로 참조했을 때 조용히 비어 나온다.

**손으로 쓴 CSS 는 별칭이 아니라 `--finch-*` 원본을 읽는다.** `index.css` 의 `body`,
`:focus-visible` 규칙이 그 예다. 별칭은 유틸리티를 위한 것이다.

### 새 토큰이 필요할 때

```
1. 기존 역할 토큰으로 되는가        → 되면 끝. 새 토큰은 마지막 수단이다
2. 안 되면 tokens.css 의 역할 층을 연다 (팔레트 사다리에서 단계를 고른다)
3. 사다리에 없는 단계가 필요하면 ladder.cjs 로 다시 뽑는다. 손으로 보간하지 않는다
4. 유틸리티로 써야 하면 그때 index.css 별칭 층에 한 줄 연다
5. npm run design:contrast 로 검증한다
```

---

## 2. 의도적 이탈

Design.md §0.1 이 🔒유지로 표시했는데 FINCH 가 벗어난 것이다. 따르지 않기로 한 것이지
아직 못 한 것이 아니다.

| 항목 | 템플릿 | FINCH | 왜 |
|---|---|---|---|
| 서체 | 시스템 폰트 (웹폰트 로드 안 함) | Gmarket Sans 서브셋 woff2 3굵기 | 발표자료와 같은 얼굴이어야 한다. 원본 TTF 2.3MB/굵기 대신 완성형 2350자 서브셋(합계 324K)만 서빙해 비용을 갚았다 |
| 모드 | light/dark 필수, 팔레트·역할 재선언 | **단일 모드** | 발표자료도 단일 모드다. 어두운 화면은 모드 전환이 아니라 어두운 배경 섹션이다. 모드를 하나 더 만들면 검증할 대비 쌍이 두 배가 되고 그 절반은 아무도 안 본다 |
| 단위 | rem + OS 글자 배율 `clamp(0.8~1.5)` | **px** | 기준 뷰포트 390 고정이다. 배율을 받으면 종목 리스트의 행 높이와 숫자 자리폭이 같이 흔들린다 |
| 타입 스케일 | `t1`~`t14` 숫자 14단 | **의미 이름 8단** (`display`…`caption`) | 숫자로 바꾸면 어느 단이 캡션이고 어느 단이 제목인지가 이름에서 사라진다. 화면을 읽을 때마다 표를 봐야 한다 |
| dimension | `x0_5`~`x30` 토큰 23개 | **Tailwind 기본 4px 스케일** | 발표자료의 4px 그리드와 1:1 로 맞는다. 따로 만들면 `p-5` 와 `space-5` 가 같은 값으로 둘 다 존재한다 |
| radius | `r0_5`~`r6` 사다리 | **컴포넌트 이름 5개** | 앱이 쓰는 반경은 다섯 개뿐이고, 각각 어느 컴포넌트의 것인지가 이름에 남아야 고를 때 헷갈리지 않는다 |
| 대비 기준 | WCAG 비율 (4.5 / 3.0) | **APCA Lc** | 비율은 밝은 회색끼리의 차이를 과대평가한다. 무채색 사다리에서 어느 단계가 실제로 읽히는지 판정하려면 Lc 가 맞다. Design.md §14 도 APCA 다 |
| z-index | 전역 스케일 두지 말 것 (§12) | **4단 토큰** | 그 규칙은 포털 DOM 순서를 통제할 수 있는 컴포넌트 라이브러리 얘기다. 앱은 상단 내비·하단 탭바·하단 고정 CTA·FAB·바텀시트가 서로 다른 트리에서 자란다 |
| 도메인 색 | manner-temp, banner, magic 그라디언트 | **전부 삭제** | 당근 전용이다 (§4.5 가 삭제 가능으로 표시) |

---

## 3. 만들지 않은 역할

다음 사람이 "왜 없지" 하고 다시 만들지 않도록 적는다. **되살리려면 이유부터 반박한다.**

| 없는 것 | 왜 |
|---|---|
| `brand-*` 전체 | 브랜드 색이 없다. Finch 의 브랜드는 잉크의 무게다. 주요 버튼은 `bg-neutral-solid`(잉크 채움) + `fg-neutral-inverted` 다. brand 를 만들면 값이 neutral 과 똑같은 토큰이 한 벌 더 생긴다 |
| `positive-*` · `warning-*` · `informative-*` | 모노톤에서 이 셋의 값은 전부 잉크다. 성공·주의·정보는 색이 아니라 문구와 아이콘과 형태로 구분한다 |
| `fg-*-contrast` 짝 | SEED 는 `-weak` 면 위 글자를 `-contrast` 로 쓰지만, 모노톤에서는 paper 위든 weak 면 위든 같은 잉크다. 값이 같은 토큰을 둘 두는 건 의식(儀式)이다 |
| `bg-critical-solid` | 파괴적 확인 버튼의 채움도 주요 버튼과 같은 잉크다. 구분은 문구와 `bg-critical-weak` 면이 한다 |
| `bg-layer-floating` | 단일 모드라 floating(시트·모달)과 default(카드)가 영원히 같은 값이다. 다크 모드였다면 고도가 높을수록 밝아져서 달랐다. 떠 있다는 건 색이 아니라 `shadow-float` 와 `z-overlay` 가 말한다 |
| `bg-neutral-weak` (불투명 회색 면) | gray-200 은 paper 위에서 Lc 0 이다. 카드 위 회색 칩·선택 면은 전부 알파(`bg-transparent-selected`)로 간다. 알파라야 흰 카드에서도 paper 에서도 아래 면을 같은 양만큼 눌러 살아남는다 |
| `stroke-up-*` · `stroke-down-*` | 캔들 차트는 `bg-up-solid`(몸통)와 `fg-up`(심지·테두리)으로 충분하다. 칩은 안의 글자가 방향을 말한다 |
| white-alpha 사다리 | 반전 표면(토스트·night)이 앱에 없다. 생기면 발표자료에서 가져온다 |
| `--color-primary` | 없어졌다. 옛 파랑 `#3b82f6` 은 하락 숫자와 구분되지 않았다. 프라이머리가 사라지면서 그 충돌도 사라졌다 |
| AI 표면 색 (`--color-ai-surface`) | 모노톤에 "AI 색" 은 없다. AI 박스는 `bg-layer-default` + `stroke-neutral-weak` + `shadow-ai` + `radius-ai` 로, 일반 카드와 획 무게·깊이·반경 셋이 한꺼번에 달라진다. 근거가 확정되지 않은 카드는 테두리를 dashed 로 바꾸고 그림자를 뺀다 — 그건 토큰이 아니라 형태다 |
| dark 블록 | 위 §2 |

---

## 4. 색 사용 규칙

- 글자·아이콘은 `fg`, 면은 `bg`, 선은 `stroke`. **`fg` 를 배경에 쓰지 않는다.**
- 눌림 색을 새로 만들지 않는다. `-pressed` 짝을 쓴다. 눌림은 **면 색만** 바뀐다 — 전경에 pressed 가 없다.
- 화면 전체 배경은 `bg-layer-basement`(paper), 그 위 콘텐츠 블록은 `bg-layer-default`.
- **색만으로 의미를 전달하지 않는다.** 등락에는 부호와 화살표, 에러에는 아이콘과 문구가 같이 온다.
  색맹 사용자와 흑백 인쇄 때문만이 아니다 — 아래 두 경우는 색이 물리적으로 안 보인다.
  - **선택·눌림 면**은 APCA 바닥 아래다(Lc 0). 의도한 것이다. 선택은 면 하나로 알리지 않고
    글자 무게나 테두리(`stroke-neutral-contrast`)가 같이 움직인다.
  - **up/down `-weak` 면**은 밝기가 흰 면과 거의 같고 색상(hue)으로만 구분된다.
    면 위 글자(`fg-up` / `fg-down`)가 방향을 말해야 한다.
- **등락은 상승 적색, 하락 청색.** 국내 관례이고 미국식과 반대다.
- **등락은 두 단계다.** 본문·캡션·표 안의 숫자는 `fg-up` / `fg-down`(700단계),
  18px 이상 굵게 나오는 큰 가격만 `-vivid`(600단계). 한 값으로 합치면 13px 캡션에서 반드시 깨진다.
- **에러에 등락 적색을 재사용하지 않는다.** 같으면 "떨어졌다" 로 오독된다.
  폼 에러는 셋을 함께 바꾼다 — 입력 테두리 `stroke-critical-solid`, 메시지 `fg-critical` + bold, 아이콘.
- **비활성은 `opacity` 가 아니라 전용 색.** opacity 는 겹친 자식 아이콘·스피너까지 흐려져 사라진다.
- **숫자는 `tabular-nums`.** `index.css` 가 `body` 전체에 건다. 숫자 글리프에만 붙는
  OpenType 기능이라 문자에는 영향이 없고, 그래서 셀렉터를 좁히지 않고 전역으로 걸었다 (§6).

---

## 5. 도구

### 사다리 다시 뽑기

`frontend/tools/ladder.cjs`. 지정 단계 사이를 oklab 으로 보간한다. **손으로 보간하지 않는다.**
gray 는 200 paper · 400 외곽선 · 700 캡션 · 900 반전 표면 · 1000 ink 가 지정값이고 나머지가 보간이다.
up·down 은 600 이 원색, 700 이 본문용이며 이 두 단계 분리가 대비 문제를 푼다.

### 대비 검사

```bash
cd frontend && npm run design:contrast
```

`tools/check-contrast.cjs` 가 `tokens.css` 를 읽어 `var()` 체인을 hex 까지 풀고 APCA Lc 를 계산한다.
의존성 0, 순수 node. 기준선은 파일 머리말에 있다 — Lc 90 본문 · 75 일반 · 60 큰 글자·bold ·
45 display · 30 placeholder·비활성 · 15 경계선.

배경 슬롯에 알파 색이 들어오면 던진다. 알파를 아래 면 없이 합성할 수 없는데
그냥 두면 순수 검정으로 읽혀 조용히 틀린 숫자가 나온다.

**검사 표에서 뺀 쌍과 이유** (도구 주석에도 있다):

| 뺀 쌍 | 왜 |
|---|---|
| selected · pressed 면 | 아래 면과의 밝기 차가 APCA 바닥 아래다. 숫자로 지키는 규칙이 아니라 형태로 지키는 규칙이다 (§4) |
| up/down `-weak` 면 자체 | hue 로만 구분된다. APCA 는 밝기만 본다. 면 위 글자로 대신 검사한다 |
| 잉크 면 위 focus-ring | 링은 `outline-offset` 으로 요소 바깥(paper 또는 카드)에 떠 있어야 하고, 그 쌍은 표에 있다 |
| night 섹션 계열 | 앱에 반전 표면이 없다. 발표자료 전용이다 |

### 팔레트 유출 검사

```bash
grep -rnE '(bg|text|border)-(red|blue|gray|slate|zinc)-[0-9]|\[#[0-9a-fA-F]{3,6}\]' frontend/src --include='*.tsx' | grep -v styles/
grep -rn 'palette-' frontend/src --include='*.tsx'
```

첫째는 Tailwind 기본 팔레트와 하드코딩 hex, 둘째는 우리 팔레트 층 직접 참조를 잡는다.
둘 다 비어야 한다. 지금 유일한 예외는 `Button.tsx` 의 카카오 로그인 버튼(`bg-[#FEE500]`)이다 —
카카오 브랜드 가이드가 강제하는 색이라 토큰화하지 않는다.

---

## 6. 결정 기록

값이 아니라 판단이 들어간 자리다. 되짚을 근거가 필요할 때 본다.

**포커스 링이 잉크인 이유.** 발표자료는 down-600(파랑)을 쓴다. 증권 화면에서 파란 링은
"하락"과 섞이고, 모노톤에 유채색을 하나 더 들이는 셈이다. 그래서 `stroke-focus-ring` 은 잉크다.
대신 **반드시 `outline-offset` 으로 요소 바깥에 띄운다** — offset 0 이면 잉크 채움 버튼 위에서
링과 버튼이 같은 색이라 사라진다. `index.css` 의 `:focus-visible` 규칙이 2px 링 + 2px offset 을
전역으로 건다. 반전 표면이 생기면 반전용 링 토큰이 그때 필요하다.

**elevation 이 4단인 이유.** base 0 · sticky · floating · overlay. 10 씩 띄운 건 일회성 예외가
사이에 들어와도 전체를 다시 매기지 않기 위해서다. 딤·시트·다이얼로그·토스트는 모두 overlay 한 층이고
그 안의 순서는 포털 DOM 순서로 정한다. 토스트가 다이얼로그 위에 와야 하는 것도 DOM 순서에 달려 있다.

**z 토큰에 쓸 길을 낸 이유.** `--finch-z-*` 넷은 있었지만 Tailwind v4 에 `z` 테마
네임스페이스가 없어 유틸리티가 생기지 않았다 — `z-sticky` 같은 클래스는 애초에 만들어지지
않는다. `duration` 이 이미 같은 문제였고 `index.css` 가 `:root` 에 `--motion-*` 별칭을 두고
`duration-(--motion-fast)` 임의값 문법으로 풀었다. z 도 같은 자리에 `--z-*` 로 별칭을 냈다 —
`z-(--z-sticky)`. `@theme` 이 아니라 `:root` 인 이유도 같다: 테마 네임스페이스가 없는 값은
`@theme` 에 넣어도 유틸리티가 안 생긴다.

**숫자 `tabular-nums` 를 `body` 전체로 넓힌 이유.** 원래 `:where(table, dd, output, time)`
넷에만 걸려 있었는데, 종목 시세 행처럼 리스트 안 `<span>` 으로 그려지는 숫자는 그 넷 중
어디에도 안 든다. `font-variant-numeric` 은 숫자 글리프에만 붙는 OpenType 기능이라 문자
렌더링에는 영향이 없다 — 그래서 셀렉터를 하나씩 추가하는 대신 `body` 에 걸어 모든 숫자를
한 번에 덮었다. 새 컴포넌트가 이 규칙을 챙기려고 클래스를 기억할 필요가 없다.

**비활성 두 단계를 함께 내린 이유.** 측정이 근거다.

| 면 / 글자 | 면 vs paper | 라벨 vs 면 |
|---|---|---|
| 발표자료 (gray-200 / gray-500) | 0.0 | 39.8 |
| 중간안 (gray-300 / gray-500) | 10.6 | 26.8 |
| **채택 (gray-400 / gray-600)** | **22.8** | **30.0** |

발표자료의 비활성 면은 흰 슬라이드 카드 위에만 놓인다. 앱의 하단 고정 CTA 는 paper 위에도 놓여서
그대로 쓰면 버튼 모양이 배경에 녹는다. 버튼 모양이 안 보이는 게 라벨이 흐린 것보다 나쁘다고 봤다.
라벨 30.0 은 비활성 기준선을 0.05 차로 넘는다 — **사다리를 다시 뽑으면 이 쌍부터 확인한다.**

**`shadow-float` 를 s3 으로 옮긴 이유.** 처음 값은 s1~s3 사다리 밖이었다. 한 값이라도
사다리를 벗어나면 사다리가 출처 구실을 못 한다.

**`stroke-neutral-subtle` 이 알파가 아닌 이유.** 발표자료는 black-alpha-200 을 쓰지만
흰 카드 위에서 Lc 0 이라 카드 안 구분선이 통째로 사라진다. 발표자료의 구분선은 paper 위에만
놓여서 문제가 안 됐다. 앱은 불투명 gray-300 을 쓴다.

**흰 카드는 paper 위에서 Lc 0 이다.** 면 색만으로는 카드 경계가 안 보인다.
경계는 `stroke` 가 만든다 — **카드에서 테두리를 빼지 않는다.**

---

## 7. 렌더된 스타일가이드

`prototype/styleguide.dc.html`. `tokens.css` 를 실제로 불러와 그리므로 토큰을 고치면 같이 바뀐다.
빌드에 들어가지 않는다 (`prototype/README.md`).
