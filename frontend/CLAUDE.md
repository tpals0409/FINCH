# 프론트엔드 에이전트 지침

이 문서는 `frontend/` 이하에서 작업하는 AI 에이전트가 읽는 지침이다.
사람이 읽어도 되지만, 사람용 규약의 원본은 아래 문서들이고 여기서는 중복 서술하지 않는다.

## 프로젝트 개요

기존 증권 서비스를 클론하고 AI 투자 비서 기능을 얹는 모의투자 웹 서비스다.
백엔드(Spring)가 원장과 시세의 단일 진실 공급원이고, AI 서버(FastAPI)는 백엔드를 읽어
분석과 설명을 제공한다. **프론트는 백엔드만 호출한다.** AI 기능도 백엔드가 중계하므로
프론트가 쓰는 Base URL은 `/api/v1` 하나다.

- UI 레퍼런스: 토스증권
- 플랫폼: 모바일 웹 (반응형, 모바일 우선). 기준 뷰포트 375px, 최소 지원 320px
- 최종 발표 2026-09-28. 기능 동결 9/18, 전면 동결 9/23

## 레포 구조

모노레포이고 파트별로 최상위 디렉토리가 나뉜다.

```
frontend/   프론트엔드 (이 문서의 적용 범위)
backend/    Spring
ai/         FastAPI
infra/      배포
docs/       팀 공용 문서
```

**`frontend/`와 `docs/` 밖의 파일을 고치지 않는다.**
다른 파트 디렉토리에서 문제를 발견하면 고치지 말고 보고한다.
팀 프로젝트에서 남의 코드를 조용히 바꾸는 것이 가장 나쁘다.

## 읽어야 할 문서

작업 전에 관련된 것을 읽는다. 이 문서들이 원본이고 아래 요약은 길잡이일 뿐이다.

```
docs/spec/featureSpec.md              기능 명세서 (확정판)
docs/api/apiSpec.md                   백엔드 API 명세
docs/convention/gitConvention.md      브랜치·커밋·MR 절차
docs/convention/mrConvention.md       MR 템플릿
docs/convention/frontConvention.md    프론트가 다른 파트와 공유하는 계약
frontend/docs/frontConvention.md      프론트 내부 규약 (폴더 구조, 네이밍, 상태 경계)
frontend/docs/ia.md                   화면 목록과 IA
ai/docs/api-spec.md                   AI 파트 인터페이스 계약
```

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
AI 서버는 `snake_case`에 공통 봉투를 준다. 중계된 AI 응답이 어느 쪽 형태로 오는지는 미확정이므로
변환과 정규화는 API 레이어에서 한 번만 하고, 화면 컴포넌트는 어느 서버에서 온 값인지 몰라야 한다.

**등락 색은 국내 관례를 따른다. 상승 적색, 하락 청색.** 미국식과 반대다.
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

## 커밋과 MR

`docs/convention/gitConvention.md`를 따른다. 자주 어기는 것만 옮겨 적는다.

- 커밋 메시지는 `<타입>: <제목>`. **이모지를 붙이지 않는다.** 콜론 앞에 공백을 넣지 않는다
- 본문은 제목만으로 "왜"가 안 드러날 때만 쓴다. 기본은 한 줄이다
- 제목 끝에 마침표를 붙이지 않는다
- 한 커밋에는 한 가지 문제만 담는다
- 브랜치는 `S15P21A101-{티켓번호}-{기능명}`
- 1브랜치 n커밋 1MR
- **MR은 작성자 본인이 머지하지 않는다.** 리뷰한 팀원이 머지한다

---

## 감독관 프로토콜

1. 큰 이슈를 태스크로 분해할 때는 계획(태스크 목록, 워크트리 배치, 에이전트/모델 배정)을 먼저 보고하고 사용자의 "착수" 승인을 기다린다. 승인 후 세부 실행은 자율이다.
2. 아키텍처/라이브러리 등 선택지는 임의로 결정하지 않고 사용자와 직접 논의한다. 태스크를 블록해야 하면 decision gate를 사용한다.
3. worker_done 수신 시: 워커의 요약과 기록 파일 경로를 확인하고, worker-release 후 사용자에게 리뷰 요청을 올린다. 코드 머지 판단은 사용자가 diff 리뷰로 직접 한다.
4. 완료된 워커 터미널은 열어두지 않는다. 출력 재확인은 worker-read를 사용한다.
5. Jira 티켓 생성 시 담당자(assignee)는 항상 사용자 본인으로 설정한다. 생성 전 제목/설명 초안을 사용자에게 보고하고 승인받는다.

## 워커 계약

1. 작업 완료 시 CLAUDE.local.md에 명시된 기록 경로 아래에 `YYYY-MM-DD-<태스크명>.md` 새 파일을 생성해 기록한다. 그 경로가 없으면 기록을 생략하고 worker_done에 그 사실을 적는다. 템플릿: 문제 → 시도 → 해결 → 배운 것 → 결정사항. 그 경로에서 기존 파일을 읽거나 수정하지 않는다 (쓰기 전용, 새 파일만).
2. worker_done의 body에 작업 요약과 기록 파일 경로를 포함하고, --outcome과 taskId/dispatchId를 포함한다.
3. 공유 컴포넌트 디렉토리는 수정하지 않는다. 필요하면 orca orchestration ask로 감독관에게 질문한다.
4. 긴 작업 중에는 heartbeat를 보낸다.
5. 위 기록 경로 외에는 이 레포 디렉토리 밖을 읽지도 쓰지도 않는다.
6. 의존성을 추가하거나 제거하지 않는다. `node_modules`가 워크트리 간에 공유되므로 한쪽의 변경이 다른 워크트리에 즉시 번진다. 필요하면 감독관에게 질문한다.

## 모델 가이드

- 감독관: Claude Opus 5
- Claude 워커 (일반 UI/기능 구현): Sonnet 5
- Claude 워커 (고난도 — 차트 성능, AI 기능 설계, 아키텍처): Opus 5
- Codex 워커 (일반): gpt-5.6-terra, reasoning effort medium~high
- Codex 워커 (레이스/난제): gpt-5.6-sol, 필요 시 Max
- 같은 태스크 레이스: Claude Opus 5 vs gpt-5.6-sol 두 워크트리
- worker-start의 --model/--effort로 워커별 지정. 가용 모델이 이 가이드와 다르면 사용자에게 보고 후 조정.
