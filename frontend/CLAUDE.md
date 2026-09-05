# 프론트엔드 에이전트 지침

이 문서는 `frontend/` 이하에서 작업하는 AI 에이전트가 읽는 지침이다.
사람이 읽어도 되지만, 사람용 규약의 원본은 아래 문서들이고 여기서는 중복 서술하지 않는다.

## 프로젝트 개요

기존 증권 서비스를 클론하고 AI 투자 비서 기능을 얹는 모의투자 웹 서비스다.
백엔드(Spring)가 원장과 시세의 단일 진실 공급원이고, AI 서버(FastAPI)는 백엔드를 읽어
분석과 설명을 제공한다. **프론트는 백엔드만 호출한다.** AI 기능도 백엔드가 중계하므로
프론트가 쓰는 Base URL은 `/api/v1` 하나다.

- UI 레퍼런스: 토스증권
- 플랫폼: 모바일 웹 (반응형, 모바일 우선). 기준 뷰포트 390px, 최소 지원 320px

## 레포 구조

모노레포이고 파트별로 최상위 디렉토리가 나뉜다.

```
frontend/   프론트엔드 (이 문서의 적용 범위)
backend/    Spring
ai/         FastAPI
infra/      배포
docs/       팀 공용 문서
```

**`frontend/` 밖을 고칠 때는 그 파트의 `CLAUDE.md` 를 먼저 읽고, 별도 커밋으로 분리한다.**
한 커밋이 두 파트에 걸치면 나중에 어느 쪽 결정이었는지 되짚을 수 없다.

## 읽어야 할 문서

작업 전에 관련된 것을 읽는다. 이 문서들이 원본이고 아래 요약은 길잡이일 뿐이다.

```
docs/spec/featureSpec.md              기능 명세서 (확정판)
docs/api/apiSpec.md                   백엔드 API 명세
docs/convention/gitConvention.md      브랜치·커밋 규칙
.github/PULL_REQUEST_TEMPLATE.md      PR 템플릿
docs/adr/sprints/                     관련 스프린트 결정. grep 으로 찾는다
docs/convention/frontConvention.md    프론트가 다른 파트와 공유하는 계약
frontend/docs/frontConvention.md      프론트 내부 규약 (폴더 구조, 네이밍, 상태 경계)
frontend/docs/contracts.md            계약 현황 — 무엇이 확정됐고 무엇을 기다리는지
frontend/docs/ia.md                   화면 목록과 IA
docs/design/finch-seed.md             디자인 토큰 체계 (SEED 2계층). 토큰 이름의 출처
ai/docs/api-spec.md                   AI 파트 인터페이스 계약
```

**`frontConvention.md` 는 두 개다.** 위 목록처럼 **항상 전체 경로로 가리킨다** —
`docs/convention/` 쪽은 크로스파트 계약, `frontend/docs/` 쪽은 프론트 내부 규약이다.

## 기술 스택

버전은 `frontend/package.json`이 단일 진실 원천이다. 이 문서에 버전을 적지 않는다.

```
React + TypeScript + Vite
TanStack Query (서버 상태) / Zustand (클라이언트 상태)
lightweight-charts (캔들 차트)
Tailwind + Radix Primitives
Zod (런타임 검증) / MSW (목 서버)
react-router-dom
```

패키지 매니저는 npm이고 모든 명령은 `frontend/`에서 실행한다.
레포 루트에 `package.json`을 만들지 않고 npm workspaces를 쓰지 않는다.

## 자주 틀리는 지점

**의존 방향은 `app → pages → features → shared` 단방향이다.**
ESLint의 `import-x/no-restricted-paths`가 이것을 강제한다. 규칙에 걸리면 우회하지 말고
구조를 다시 본다. feature끼리 서로 import하지 않는다.

**AI 6종은 전부 일반 요청/응답이다. SSE는 폐기됐다(커밋 `34ed34a`).**
`shared/api`에 스트림 파서를 만들지 않는다. 이전 판의 "`EventSource`를 못 쓰니 `fetch` +
`ReadableStream`으로 직접 파싱한다"는 지침은 유효하지 않다. 되살리기 전에 AI 파트 구현을 확인한다.

**단위와 응답 형태가 서버마다 다르다.** 백엔드는 `camelCase`에 봉투 없이 리소스를 주고,
AI 서버는 `snake_case`에 공통 봉투를 준다. **중계된 AI 응답도 백엔드 형식으로 온다**
(apiSpec v0.5 §10.3 확정 — 백엔드가 봉투를 벗겨 재포장한다). 변환과 정규화는 API 레이어에서
한 번만 하고, 화면 컴포넌트는 어느 서버에서 온 값인지 몰라야 한다.

**등락률·수익률은 백분율 값이다.** `-1.21`이 −1.21%다. **100을 곱하지 않는다** (apiSpec §1.1).
비중처럼 등락률이 아닌 비율만 0~1 소수다.

**등락 색은 국내 관례를 따른다. 상승 적색, 하락 청색.** 미국식과 반대다.
**`src/styles/` 는 디자이너 것이다. 고치지 않는다.** `tokens.css` 도 `index.css` 의
`@theme static` 별칭 층도 마찬가지다. 필요한 토큰이 없으면 만들지 말고 무엇이 왜 필요한지 말한다 —
임의로 만든 값은 시안과 어긋나고, 어긋난 걸 나중에 찾는 비용이 기다리는 비용보다 크다.

색은 값이 아니라 의미 토큰으로 참조한다.

**종목코드는 6자리 문자열이다.** 숫자로 다루면 `005930`의 앞 `0`이 사라진다.

**주문 뮤테이션은 자동 재시도하지 않는다.** 중복 주문이 된다.

## 검증

작업을 끝내기 전에 `frontend/`에서 아래를 전부 통과시킨다.

```
npm run typecheck
npm run lint
npm run format:check
npm run build
```

초기 세팅이나 의존성을 건드린 작업은 `node_modules`를 지우고 `npm ci`부터 다시 확인한다.
`npm install`은 lock을 고쳐가며 진행하므로 다른 사람이 클론한 상황을 재현하지 못한다.

## 커밋과 PR

`docs/convention/gitConvention.md`를 따른다. 자주 어기는 것만 옮겨 적는다.

- 커밋 메시지는 `<타입>: <제목>`. **이모지를 붙이지 않는다.** 콜론 앞에 공백을 넣지 않는다
- 본문은 제목만으로 "왜"가 안 드러날 때만 쓴다. 기본은 한 줄이다
- 제목 끝에 마침표를 붙이지 않는다
- 한 커밋에는 한 가지 문제만 담는다
- 브랜치는 `<type>/sprint-<N>-<설명>`. 루트 `CLAUDE.md` 참고
- 1브랜치 n커밋 1PR, squash 머지
- CI 가 녹색이어야 머지한다
