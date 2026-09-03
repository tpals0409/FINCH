# FINCH

기존 증권 서비스를 클론하고 AI 투자 비서를 얹은 모의투자 웹 서비스. SSAFY 팀 프로젝트(S15P21A101)에서
갈라져 나온 개인 ver2 다. **백엔드가 원장과 시세의 단일 진실 공급원**이고, 프론트는 백엔드만 호출하며,
AI 서버는 백엔드가 중계한다. AI 는 원장을 읽어 설명할 뿐 쓰지 않는다.

> Calculation 은 Engine 이 하고, Explanation 은 AI 가 한다. LLM 은 어떤 수치도 스스로 만들지 않는다.

## 레포 구조와 브리핑

파트별로 최상위 디렉터리가 나뉘고, 각 디렉터리의 `CLAUDE.md` 가 그 파트의 브리핑이다.
그 디렉터리 안에서 작업하면 자동으로 읽힌다. 다른 파트를 건드릴 때는 그쪽 브리핑을 먼저 읽는다.

```
backend/    Spring Boot 4 · Kotlin           → backend/CLAUDE.md
frontend/   React · Vite · TypeScript        → frontend/CLAUDE.md
ai/         FastAPI · RAG · pgvector          → ai/CLAUDE.md
infra/      로컬 compose (레거시)             → infra/CLAUDE.md  (배포 SSOT 는 finch-gitops)
docs/       명세 · 컨벤션 · ADR
```

배포 매니페스트는 이 저장소에 없다. `~/Desktop/finch-gitops` (github.com/tpals0409/finch-gitops) 가
k8s·ArgoCD 의 단일 진실 공급원이다. `infra/` 의 compose 는 로컬 개발용으로만 남는다.

## 읽어야 할 문서

```
docs/adr/README.md                    ADR 체계. 스프린트 회고와 영구 결정의 보관 규칙
docs/adr/sprints/sprint-{N}.md        스프린트별 결정·구현·교훈. 최근 것부터 읽는다
docs/api/apiSpec.md                   백엔드 API 계약. 프론트·AI 와 어긋나면 이 문서가 기준
docs/api/aiApiSpec.md                 백엔드 ↔ AI 인터페이스 계약
docs/spec/featureSpec.md              기능 명세
docs/convention/*.md                  파트별 컨벤션. 각 브리핑이 필요한 것을 가리킨다
```

## 공통 규칙 (전 파트)

### 작업 흐름

1. `/sprint-open` 으로 스프린트를 연다. 윈도우와 잔여 항목이 대시보드로 나온다
2. 작업 브랜치를 판다. `git switch -c <type>/sprint-<N>-<설명>`
3. 해당 파트 브리핑을 읽고 구현한다
4. 파트 브리핑의 **검증** 절차를 통과시킨다. 통과 못 한 작업은 끝난 게 아니다
5. PR 을 열고 CI 가 녹색이면 squash 머지한다
6. `/sprint-close` 로 닫는다. ADR 이 생성되고 윈도우가 밀린다

### 브랜치와 머지

- `master` 에 직접 커밋하지 않는다. 항상 브랜치 + PR + squash 머지
- 브랜치 이름은 `<type>/sprint-<N>-<설명>`. 스프린트 번호가 들어가야 ADR 에서 커밋을 되짚을 수 있다
- 머지 후 브랜치는 지운다

### 커밋

`docs/convention/gitConvention.md` 를 따른다. 자주 어기는 것만 옮겨 적는다.

- `<type>: <제목>` 또는 `<type>(<scope>): <제목>`. **이모지 없음**, 콜론 앞 공백 없음
- 제목은 한글, 완료형(`추가`·`수정`·`변경`), 50자 이내, 마침표 없음
- 본문은 **왜**를 쓴다. 무엇을 했는지는 diff 가 말한다. 제목으로 충분하면 본문을 쓰지 않는다
- 한 커밋에 한 가지 변경. 리팩터링과 기능을 섞지 않는다

### 코드

- 함수는 한 가지 일만 한다. 길어지면 쪼갠다. 줄 수 상한은 두지 않는다
- 이미 있는 헬퍼·타입·패턴을 먼저 찾는다. 몇 파일 건너에 있는 걸 다시 만드는 게 가장 흔한 낭비다
- 주석은 **왜**를 설명할 때만 쓴다. 파일 헤더 어노테이션(`@file`·`@domain` 류)은 쓰지 않는다
- 하드코딩된 색·URL·키를 두지 않는다. 토큰·설정·환경변수로 뺀다

### 검증은 물리적 사실로

"됐을 것이다"는 검증이 아니다. 빌드가 EXIT 0 인지, 테스트가 몇 개 통과했는지, 렌더가 몇 리소스를 냈는지
**실측 수치**로 적는다. ADR 의 검증 절에도 같은 기준을 쓴다.

## 보안

- 로그에 JWT·토큰·키·PII·DB 연결 문자열을 남기지 않는다
- 비밀값은 `.env` 에만 두고 커밋하지 않는다. `.env.example` 에는 키 이름과 형식만 적는다
- 배포 시크릿은 SealedSecret. 평문 Secret 을 finch-gitops 에 넣지 않는다
- AI 서버는 외부에 노출하지 않는다. 백엔드가 넘긴 `X-Internal-Token` 만 믿고 `X-User-Id` 는 검증 없이 신뢰하므로,
  외부에서 닿으면 누구나 남의 데이터를 읽는다
- 종목코드는 6자리 **문자열**이다. 숫자로 다루면 `005930` 의 앞 `0` 이 사라진다
- 주문 뮤테이션은 자동 재시도하지 않는다. 중복 주문이 된다

## 에이전트 운용

Oracle 같은 중앙 위임자를 두지 않는다. 필요할 때 세민이 직접 파트 브리핑을 지정해 위임한다.
서브에이전트에게 맡길 때는 작업 디렉터리를 파트 안으로 잡아 그 브리핑이 자동으로 로드되게 한다.

파트 브리핑과 별도로 **역할 에이전트**가 있다. `.claude/agents/` 에 정의돼 있고 Agent 툴의 `subagent_type` 으로 부른다.

| 에이전트 | 소유 | 부르는 때 |
|---|---|---|
| `backend` | `backend/src`, 스키마, `docs/api/apiSpec.md` | 원장·계좌·충전·주문·시세·AI 중계, 마이그레이션, API 계약. 돈이 오가는 코드라 "됐을 것이다"가 안 통한다 |
| `frontend` | `frontend/src`, `frontend/docs/**` | 화면 구현, API 레이어, 상태 경계, 라우팅, MSW 목. 계약이 어긋나면 혼자 정하지 않고 `contracts.md` 에 올린다 |
| `ai` | `ai/**` | 엔진 계산(Portfolio·Risk·Attribution), 공시·뉴스 수집과 검색, 프롬프트·Guardrail, 사용자 위키. 원장은 읽기만 한다 |
| `designer` | 토큰 SSOT(`frontend/src/styles/`), `prototype/`, 브랜드 마크 | 화면 시안, 토큰 결정, 대비·반응형 감사. 프론트가 로직을, 디자이너가 그릇을 만든다 |
| `infra` | `infra/**`, `.github/workflows/**`, finch-gitops | CI/CD, 컨테이너 이미지, k8s 배포(ArgoCD·Helm), 관측 스택. 배포 SSOT 는 이 저장소가 아니다 |
| `librarian` | `docs/wiki/**`, ADR 색인, 문서 간 링크 | 문서끼리 어긋나거나 없어진 것을 가리킬 때. "이거 어디 적혀 있어?" 에 답한다 |

토큰은 **디자이너 확정 → 프론트 등록** 순서다. 프론트가 임의로 토큰을 만들지 않는다.
토큰은 2계층이다 — `frontend/src/styles/tokens.css` 가 SEED 토큰(`--finch-*`)을 담는 값의 출처이고,
`index.css` 의 `@theme static` 별칭 층이 그중 유틸리티로 열 것만 Tailwind 네임스페이스로 옮겨 적는다.
구조와 규칙은 `docs/design/finch-seed.md` 에 있다.

아직 붙이지 않은 것과 붙일 시점:
- **자동 교차 리뷰(Critic)**: 커밋마다 두 번째 모델이 리뷰. Codex CLI 가 준비되면 붙인다
- **ADR 영문 미러**: 공개할 이유가 생기면 붙인다
- **파일 헤더 어노테이션**: 서비스가 늘어 grep 으로 도메인을 찾아야 할 때 붙인다

## `.claude/` 추적 정책

`.claude/commands/**` 와 `.claude/agents/**` 는 tracked (스프린트 명령·역할 에이전트의 SSOT). 나머지 `.claude/*` 는 untracked (로컬 세션·설정).
명령을 추가하면 이 문서의 "작업 흐름" 절도 같이 고친다.
