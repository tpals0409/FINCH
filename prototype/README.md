# prototype

디자인 산출물 보관소. 와이어프레임, 화면 시안, 캐릭터, 브랜드 에셋을 파트 구분 없이 여기 모은다.

**빌드에 들어가지 않는다.** 서비스가 실제로 쓰는 이미지와 아이콘은 `frontend/public/` 에 둔다.
여기 있는 파일은 기록과 공유용이며, `.dockerignore` 로 빌드 컨텍스트에서도 제외한다.

## 구조

| 위치 | 담는 것 | 형식 |
|---|---|---|
| 루트 | 토큰 체계 그 자체를 그린 것 (`styleguide.dc.html`) | `.dc.html` |
| `wireframe/` | 저해상도 와이어프레임. 레이아웃과 요소 배치를 정하는 단계의 산출물 | `.dc.html` |
| `screen/` | 화면 시안과 프로토타입 캡처 | `.dc.html` · 확정본 PNG |
| `character/` | 캐릭터 디자인 | SVG |
| `brand/` | 로고, 심볼, 아이콘의 SVG 원본 | SVG |

**화면을 그리는 것은 `.dc.html`(design canvas)이 기본이다.** 다중 아트보드를 한 캔버스에 놓고
`tokens.css` 를 실제로 불러와 그린다. 이전 판은 와이어프레임을 PNG 로만 적어 뒀는데 루트에 이미
`styleguide.dc.html` 이 있었다 — 문서가 현실과 어긋난 자리였다. PNG 규칙은 아래 "형식" 절을 본다.

## 파일명

`<화면 또는 대상>-<변형>.<확장자>` 형식으로 소문자와 하이픈만 쓴다.

```
wireframe/sprint-4.dc.html
screen/stock-detail-character.png
character/finch-default.svg
brand/logo-wordmark.svg
```

와이어프레임은 한 캔버스에 여러 화면을 담으므로 화면 이름이 아니라 **그 캔버스가 다루는 범위**로
이름 짓는다. `sprint-4.dc.html` 은 Sprint 4 가 계약을 완성한 화면들이라는 뜻이다.
`deposit.dc.html` 처럼 화면 하나로 이름 붙이면 같은 캔버스 안의 잔고·내역이 이름 밖에 남는다.

날짜나 `final`, `v2` 같은 접미사는 붙이지 않는다. 이력은 git 이 갖고 있고,
파일명에 버전을 적기 시작하면 어느 것이 최신인지 파일명만으로는 알 수 없게 된다.
같은 대상의 다른 방향을 함께 두어야 할 때만 `-character`, `-mono` 처럼 변형 이름을 붙인다.

## 형식

**로고와 아이콘, 캐릭터는 SVG 로 둔다.** SVG 는 텍스트라 수정분이 diff 로 남고
파일 크기도 작다. 확대해도 깨지지 않아 발표 자료에 그대로 쓸 수 있다.

**PNG 는 캡처에만 쓴다.** 바이너리라 한 글자를 고쳐도 파일 전체가 새 객체로 쌓인다.
작업 중인 중간 캡처는 올리지 않고 확정본만 올린다.

Figma 같은 도구의 원본 파일은 올리지 않는다. 링크로 공유하고 여기에는 내보낸 결과만 둔다.

### `.dc.html` 은 토큰을 실제로 참조해야 한다

`.dc.html` (design canvas) 시안은 `styles/tokens.css` 를 `<link>` 로 불러와야 한다 —
`styleguide.dc.html` 이 그 방식이다. `tokens.css` 를 고치면 시안도 같이 바뀌어야
안 썩는다. **손으로 적은 hex 색값이 들어간 `.dc.html` 은 시안이 아니라 화석이다** — 토큰이
바뀌어도 따라가지 않고, 지운 색(옛 `--color-primary` 파랑, 버린 상승 적색 등)이 그대로
남아 있으면 다음 사람이 그걸 "실제 구현" 으로 읽고 지운 시스템을 복원한다. 그런 파일을
발견하면 토큰을 실제로 불러오게 고치거나 지운다 — 경고 배너만 붙이는 건 열어 보는 사람이
안 읽으면 소용없다.

`.dc.html` 을 Artifact 로 확인할 때 인라인한 사본은 확인용으로만 쓰고 커밋하지 않는다
(`styleguide.dc.html` 머리말 참고). 통째로 인라인·번들된 `.dc.html` (폰트·에셋이
data URI 나 자산 ID 로 박혀 수 MB 짜리가 된 것)을 커밋하면 그 사본이 곧 위 화석이 된다.

`screen/finch-screens.dc.html` 은 Sprint 3 에서 지웠다 — 토큰 마이그레이션 이전의 색이 박힌
번들 사본이라 열면 지운 시스템을 되살리게 된다. 필요하면 `git show a62cc42:prototype/screen/finch-screens.dc.html`.
정확히 이 상태였다 — 옛 파랑 프라이머리 · 버린 상승 적색 · 옛 잉크 값이 손으로 박혀 있고
Gmarket Sans 이전의 Pretendard 를 실었다. `frontend/src/app/layouts/AiFloatingOverlay.tsx`
가 이 파일을 "프로토타입의 실제 구현" 으로 인용하고 있었는데, 다시 만들려면 화면
시안을 새로 그려야 해서(`contracts.md` P10 등이 열려 있어 지금 그리면 절반이 버려진다)
이번엔 지웠다. 그 사실 자체(`showFab` 배치)는 `frontend/docs/ia.md` §3 에 이미 프로즈로
남아 있어 파일을 지워도 없어지지 않는다.
