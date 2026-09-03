---
sprint: 2
title: "FINCH SEED"
date: "2026-09-03"
status: completed
parts: [frontend]
related_adrs: ["sprint-1"]
topics: [design-system, seed, design-token, 역할-토큰, apca, tailwind-v4, 스타일가이드]
tldr: "당근 SEED 방법론을 앱으로 옮겨 디자인 토큰에 palette → fg/bg/stroke 역할 층을 세웠다. 프레임워크와 무관한 --finch-* 층을 :root 에 두고 Tailwind @theme 은 의도적으로 좁은 별칭 문으로 뒀다 — 정의 116개에 별칭 16개. 팔레트를 별칭에 올리지 않아 text-palette-gray-700 같은 유틸리티가 아예 생기지 않는다. 대비 검증을 WCAG 비율에서 APCA Lc 로 옮기고, tokens.css 를 실제로 읽는 스타일가이드와 스펙 문서를 함께 만들었다. Sprint 1 이 값을 옮겼다면 이번엔 구조다."
---
# Sprint 2 — FINCH SEED

_날짜: 2026-09-03_

## 목표

Sprint 1 은 팔레트의 **값**을 발표자료로 옮겼다. 그 위의 **구조**를 세운다.
디자이너가 새 상태(눌림·weak·선택)를 만들 때 참조할 토큰과 뽑을 규칙이 있게 하는 것이 목적이다.

## 결정 사항

### D1. 2계층 — SEED 층과 Tailwind 별칭 층을 나눈다

`:root` 에 프레임워크 무관한 `--finch-*` 를 두고, Tailwind `@theme static` 은 그걸 참조하는 별칭만 적는다.

1계층(Tailwind 네임스페이스에 SEED 이름)이 더 짧지만 기각했다. **팔레트가 유틸리티로 샌다.**
`--color-palette-gray-700` 을 정의하는 순간 Tailwind 가 `text-palette-gray-700` 을 만들고,
존재하는 유틸리티는 언젠가 쓰인다. `designer.md` 가 금지 1번으로 못 박은 "팔레트 직접 참조"가
남의 팔레트가 아니라 자기 팔레트에서 되살아난다.

별칭 층의 비용(이름을 두 번 적음)이 곧 기능이다. **노출할 것만 손으로 적으므로 문이 좁게 유지된다.**
정의 116개에 별칭 16개다.

부수 효과로 Tailwind 를 갈아타도 SEED 가 남는다. 발표자료가 Tailwind 없이 같은 체계로 도는 것이 증거다.

### D2. 옛 이름 호환 별칭을 남기지 않는다

`--color-text-primary` → `--color-fg-neutral` 로 바꾸면서 옛 이름을 남기지 않았다.
남기면 시스템이 두 언어를 영구히 쓴다. 컴포넌트가 13개 파일뿐인 지금이 가장 싼 시점이었다.

대가는 **반쪽만 머지하면 앱이 색 없이 렌더된다**는 것이다. 옛 유틸리티가 테마에서 사라져
`dist` CSS 에 클래스가 0개가 되고, `format:check` 도 같은 이유로 빨개진다
(prettier 의 `tailwindStylesheet` 가 미지 클래스를 앞으로 민다).
그래서 토큰과 치환을 한 PR 에 묶었다.

### D3. 만들지 않은 역할을 문서에 적는다

brand · positive · warning · informative · `fg-*-contrast` · `bg-critical-solid` ·
`bg-layer-floating` · `bg-neutral-weak` · `stroke-up/down` · white-alpha — 열한 개를 만들지 않았다.
모노톤에서 이것들은 잉크와 형태로 푸는 것이지 빠뜨린 게 아니다.

**없는 것을 문서에 적지 않으면 다음 사람이 다시 만든다.** `docs/design/finch-seed.md` §3 이
각각의 이유를 들고 "되살리려면 이유부터 반박한다"로 닫는다.

### D4. 대비 기준을 WCAG 비율에서 APCA Lc 로 옮긴다

WCAG 명암비는 밝은 회색끼리를 과대평가해 무채색 사다리를 제대로 판정하지 못한다.
발표자료의 `check-contrast.cjs`(순수 node, 의존성 0)를 가져와 접두사와 검사 표를 앱 역할 집합으로 다시 짰다.
발표 전용(night 섹션 · noise · brand-contrast)을 빼고 앱 전용(skeleton · disabled · focus-ring)을 넣어 35쌍이 됐다.

검사 표에서 **뺀** 쌍도 이유와 함께 도구 주석에 남겼다 — 선택·눌림 면(알파-200 은 APCA 바닥 아래)과
up/down weak 면(밝기가 흰 면과 같고 hue 로만 구분돼 APCA 가 못 본다).
**검사가 못 보는 자리가 있다는 사실 자체가 "색만으로 알리지 않는다"의 근거다.**

### D5. 포커스 링은 잉크다

발표자료는 down-600 을 쓰지만 증권 화면에서 파란 링은 "하락"과 섞이고, 모노톤에 유채색을 하나 더 들이는 셈이다.
gray-1000 으로 갔다.

토큰만으로는 부족해 `:focus-visible { outline: 2px solid …; outline-offset: 2px }` 규칙을 함께 넣었다.
**offset 이 0 이면 ink 채움 버튼 위에서 링이 사라진다** — offset 이 이 토큰의 전제 조건이라 규칙까지 같이 가야 했다.

### D6. 타이포·반경·모션도 SEED 층으로 내린다 (범위 확장)

계획은 색만이었다. 스펙 문서를 쓰다 **"값의 출처는 `tokens.css` 다"가 거짓말**인 것을 발견했다 —
타이포 8단·반경 5개·모션 4개가 `index.css` 의 `@theme` 에만 있었다.

`@theme` 은 Tailwind at-rule 이라 **브라우저가 내용째로 버린다.** 스타일가이드가 그 값을 읽을 수 없어
손으로 적어야 했고, 손으로 적은 값은 썩는다. 색과 같은 모양으로 내렸다.
화면 코드는 영향이 없다 — `rounded-sm` · `ease-standard` · `duration-(--motion-fast)` 가 그대로 남는다.

### D7. 비활성 두 단계를 함께 내린다

Sprint 1 값(gray-300 면 / gray-500 글자)은 비활성 버튼이 paper 배경 위에서 Lc 10.6 으로 사라졌다.
발표자료 값(gray-200)은 앱 배경이 곧 gray-200 이라 Lc 0 이다.

| | 면 vs paper | 라벨 vs 면 |
|---|---|---|
| Sprint 1 (g300 / g500) | 10.6 ✗ | 26.8 ✗ |
| 발표자료 (g200 / g500) | 0.0 ✗ | 39.8 ✓ |
| **채택 (g400 / g600)** | **22.8 ✓** | **30.0 ✓** |

버튼 모양이 배경 위에 남지 않는 것이 라벨이 흐린 것보다 나쁘다고 봤다.

## 구현

- **e81d145** — FINCH SEED 디자인 토큰 체계 수립 (PR #4, squash. 원 커밋 5개)

원 커밋: `b8bf142` 토큰 2계층 + 도구 이식 · `121df5a` 컴포넌트 13파일 치환 ·
`103b717` 타이포·반경·모션 이관 · `dc26c84` 스펙 문서 + 스타일가이드 + 브리핑 ·
`4bdaca5` 죽은 인용 제거

**규모(물리적 사실)**: 22개 파일, +1557/−251

신규: `frontend/src/styles/tokens.css` · `frontend/tools/{check-contrast,ladder}.cjs` ·
`docs/design/finch-seed.md`(215줄) · `prototype/styleguide.dc.html`(410줄)

**검증(물리적 사실)**:

| 항목 | 결과 |
|---|---|
| `npm run design:contrast` | **35건 모두 통과** (APCA), 실패 0 |
| `npm run typecheck` · `lint` · `format:check` | EXIT 0 |
| `npm run build` | EXIT 0 — 211 modules, CSS 22.50 kB (gzip 5.11 kB) |
| 팔레트 유출 grep (`.tsx`) | 0건 |
| 토큰 밖 색 grep | 1건 — 카카오 `bg-[#FEE500]`, 기존 예외 |
| 스타일가이드 토큰 참조 | 116개 정의 중 114개 `var()` 참조, 깨진 참조 0 |
| 실제 렌더 | 로컬 서버로 3개 아트보드 전부 확인 |

CSS 는 Sprint 1 기준선(16.07 kB / gzip 4.16 kB)에서 gzip +0.95 kB. SEED 층 116 토큰이 항상 방출되는 값이다.

같이 풀린 Sprint 1 이월 부채 넷: Card 외곽선(paper 위 10.6 → 22.8) · `text-muted` 12px 두 곳(→ 76.4) ·
비활성 두 단계 · 포커스 링 토큰.

## 인시던트

1. **`cmd | tail` 이 종료 코드를 가렸다**: 백엔드 테스트를 Podman 소켓으로 돌리고 "EXIT 0" 이라 보고했으나,
   그 0 은 파이프 끝 `tail` 의 값이었다. 실제로는 `BUILD FAILED` 였고 원인은 Podman 이 아니라
   **JDK 21 부재**였다(설치된 것은 25 와 11, `build.gradle` 툴체인은 21). 출력을 다시 읽고 정정했다.
   `set -o pipefail` 없이 파이프 뒤 `$?` 를 검증 수치로 쓰면 안 된다.

2. **`compileJava` 의 EXIT 0 이 가짜였다**: 툴체인이 없는데도 통과한 것은 이미 빌드돼 있어
   up-to-date 로 건너뛴 것뿐이었다. **아무것도 안 한 태스크의 성공은 검증이 아니다.**

3. **반쪽 머지 위험**: D2 의 결과로 토큰 커밋만 머지하면 앱이 색 없이 렌더되고 `format:check` 도 빨개진다.
   한 PR 에 묶어 해소했지만, 커밋 단위로는 여전히 반쪽이 존재한다.

## 이월

- **백엔드 Sprint 3 의 전제 — JDK 21 설치.** `brew install openjdk@21`. Podman 은 정상이고 이미지 pull 까지 확인됐다
- **GitHub Actions CI 신설** — PR #4 도 CI 없이 머지됐다. Sprint 1 부터 이월 중
- `--finch-*` 116개에 별칭 16개. 좁은 문은 의도지만 20개를 넘기면 문 구실을 하는지 다시 본다
- 반전 표면(토스트·night)이 생기면 white-alpha 사다리 · `fg-*-on-inverted` · 반전용 focus-ring 이 한꺼번에 필요하다. 잉크 링은 어두운 면 위에서 무효다
- 토스트와 다이얼로그가 같은 `z-overlay`. 포털 DOM 순서에 의존한다
- `@fontsource/jetbrains-mono` 가 설치돼 있으나 어디서도 import 되지 않는다
- 타입 스케일 토큰이 정의만 되고 컴포넌트는 `text-sm` 을 쓴다. 화면이 생길 때 치환한다

## 교훈

- **파이프 뒤의 종료 코드는 종료 코드가 아니다.** `cmd | tail` 의 `$?` 는 `tail` 의 것이다.
  "실측 수치로 적는다"는 규칙이 도구 사용법을 모르면 오히려 거짓 확신을 만든다. 검증 명령은 파이프 없이 돌리거나 `pipefail` 을 켠다.
- **아무것도 안 한 태스크의 성공은 검증이 아니다.** up-to-date 로 건너뛴 `compileJava` 가 EXIT 0 이었다.
  통과했다는 사실보다 **무엇이 실제로 실행됐는지**를 본다.
- **값이 한 곳에 있다고 문서에 쓰기 전에 그 곳을 실제로 읽어본다.** `@theme` 은 브라우저가 버리는
  at-rule 이라 SSOT 라고 부를 수 없었다. 문서를 쓰는 행위가 구조의 거짓말을 잡아냈다.
- **없는 것을 적어야 다시 만들지 않는다.** 역할 토큰 열한 개를 만들지 않은 이유를 문서에 남겼다.
  설계에서 가장 자주 잃어버리는 정보는 "왜 이건 안 만들었나"다.
- **검사가 못 보는 자리를 아는 것이 검사보다 중요하다.** APCA 는 선택 면과 up/down weak 면을 판정하지 못한다.
  그 사실이 곧 "색만으로 알리지 않는다"가 규칙인 이유다.
