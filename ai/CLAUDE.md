# AI 파트 에이전트 지침

이 문서는 `ai/` 이하에서 작업하는 AI 에이전트가 읽는 지침이다.
사람이 읽어도 되지만, 사람용 규약의 원본은 아래 문서들이고 여기서는 중복 서술하지 않는다.

## 프로젝트 개요

국내 주식 모의투자 앱에 얹는 Personal Investment Copilot 의 AI 파트다.
사용자의 포트폴리오와 신뢰할 수 있는 금융 데이터를 연결해 투자 상황을 이해하고 설명한다.

> **Calculation 은 Engine 이 하고, Explanation 은 AI 가 한다.** LLM 은 어떤 수치도 스스로 만들지 않는다.

- 원장(거래·보유)은 백엔드가 소유한다. AI 는 **읽기만** 한다
- 시계열·섹터·공시는 백엔드가 주지 않는다. `ingest/` 로 우리 DB 에 적재한 것을 쓴다
- 호출 경로는 **프론트 → 백엔드 → AI**. AI 서버는 외부에 노출하지 않는다
- 국내 주식 전용(KOSPI·KOSDAQ), KRW 단일, 실계좌 연동 없음

## 구조

```
app/
├── engines/   Portfolio · Risk · Attribution 계산. 결정론적, LLM 무관
├── rag/       DART 공시 · 뉴스 수집, 임베딩, 하이브리드 검색(밀집+어휘 RRF)
├── llm/       프롬프트 조립, 생성, guard/ 에 입력·출력 Guardrail
├── api/       FastAPI 라우터. routes/ 에 briefing · chat · feedback · orders · portfolio · stocks · wiki
├── wiki/      사용자 투자 논지 · 성향
└── core/      설정, DB, adapters.py 의 ledger_source()
ingest/        시세 · 공시 · 종목 마스터 배치 적재
prompts/       프롬프트 파일. 코드가 아니라 데이터. 버전 태그를 응답 로그에 남긴다
tests/golden/  손으로 검산 가능한 회귀 케이스
eval/          평가셋과 실행 결과
docs/          설계 문서 (.md 가 에이전트용, .html 은 사람용)
```

## 읽어야 할 문서

작업 전에 관련된 것을 읽는다. **`.md` 를 읽는다.** 같은 내용의 `.html` 은 절반이 태그라 컨텍스트를 낭비한다.

```
ai/docs/api-spec.md               프론트 계약, 외부 의존과 자체 조달 범위
ai/docs/engine-formulas.md        Portfolio · Risk · Attribution 산식과 검증 항등식
ai/docs/prompt-policy.md          프롬프트 계층, 답변 구조, Guardrail, 모델 라우팅
ai/CONTRIBUTING.md                커밋 scope, 적재 순서, worktree 부트스트랩
docs/api/aiApiSpec.md             백엔드 ↔ AI 인터페이스 계약 (§4 인증, §4.1 데이터 분담)
docs/adr/sprints/                 관련 스프린트 결정. grep 으로 찾는다
```

`ai/docs/openapi.json` 은 실제 구현 스키마다. 문서와 어긋나면 이쪽이 사실이다.

## 기술 스택

버전은 `ai/requirements.txt` 가 단일 진실 원천이다. 이 문서에 버전을 적지 않는다.

```
Python / FastAPI / uvicorn
SQLAlchemy async + asyncpg / PostgreSQL + pgvector / Alembic
LLM: SSAFY GMS gpt-5.4-mini (기본), 임베딩도 GMS
외부 데이터: DART 공시, NAVER API HUB 뉴스, KIS 시세
pytest / Ruff
```

모든 명령은 `ai/` 에서 실행한다.

## 자주 틀리는 지점

**`LEDGER_SOURCE` 가 원장을 어디서 읽을지 정한다.** 선택은 `app/core/adapters.py` 의 `ledger_source()` 한 곳에서만 한다.
`seed`(기본, 픽스처) · `backend`(`/internal/v1`) · `none`(원장 없음). `none` 이면 개인화 섹션이 조용히 꺼지고
포트폴리오 진단은 `INSUFFICIENT_DATA` 로 나간다. 에러가 아니라 설계된 동작이다.

**`APP_ENV=local` 은 내부 토큰 검증을 통째로 끈다** (`app/api/deps.py`). 로컬 편의를 위한 것이고, 배포 환경에서는
반드시 `prod` 로 명시한다. `ai.env` 가 없으면 기본값 `local` 로 떠서 인증이 열린 채 기동한다.

**`X-User-Id` 는 검증 없이 신뢰한다.** 백엔드가 JWT 를 끝내고 넘긴 값이기 때문이다. 그래서 AI 서버가 외부에서
닿으면 누구나 헤더를 위조해 남의 위키를 읽는다. Ingress 를 만들지 않는다.

**적재 순서는 `instruments` → `prices` 다.** `price_daily.ticker` 가 `instruments` 를 참조한다. 제약을 완화하지 않는다.
마스터에 없는 종목의 시세는 섹터도 DART 번호도 없어 해석할 수 없다.

**프롬프트는 소스에 하드코딩하지 않는다.** `prompts/` 에 두고 버전 태그를 응답 로그에 기록한다.

**파생 지표를 백엔드에서 받아 쓰지 않는다.** 화면마다 값이 어긋난다. 원장만 읽고 직접 계산한다.

**사용량 한도는 DB 장부다.** 여러 Pod 가 같은 한도를 공유한다. 요청 창은 현재·직전 두 칸을 겹치는 비율로
가중 합산한다. 창 경계에서 두 배가 통과하던 버그가 있었고 그렇게 막았다. `local` 은 메모리 장부를 쓴다.

**툴콜링 에이전트는 `Ask My Portfolio` 하나뿐이다.** 나머지 기능은 엔진 출력 JSON 을 받아 문장만 만드는 단방향 파이프라인이다.

## 검증

작업을 끝내기 전에 `ai/` 에서 아래를 통과시킨다.

```
./scripts/check.sh
```

린트 · 마이그레이션 드리프트 · 테스트 · 평가 지표 · OpenAPI 스키마 최신 여부 등 7종을 순서대로 돌리고
실패를 한 번에 모아 보고한다. DB 나 의존성이 없으면 무엇을 실행해야 하는지 알려주고 멈춘다.

- DB 는 Postgres + pgvector 컨테이너 하나만 호스트에 띄운다. worktree 마다 띄우면 5432 가 충돌한다
- 스키마를 바꿨으면 `alembic upgrade head` 후 드리프트 검사가 통과해야 한다
- 산식을 바꿨으면 `tests/golden/` 의 검증 항등식이 통과해야 한다

## 커밋

루트 `CLAUDE.md` 의 공통 규칙에 더해, AI 파트는 어느 모듈을 고쳤는지 드러나도록 **scope 를 붙인다**.

| scope | 범위 |
|---|---|
| `engine` | Portfolio · Risk · Attribution 계산 |
| `rag` | 공시 · 뉴스 수집, 임베딩, 검색 |
| `llm` | 프롬프트 조립, 생성 |
| `guard` | Guardrail 입력단 · 출력단 |
| `api` | FastAPI 라우터, 스키마 |
| `wiki` | 사용자 논지 · 성향 |
| `ingest` | 배치 적재 |
| `eval` | 평가셋, 골든 케이스 |
| `infra` | 설정, CI, 의존성 |

## 절대 하지 않는 것

| 금지 | 이유 |
|---|---|
| `.env` 커밋 | KIS · DART · GMS 키. 히스토리에 한 번 들어가면 따라간다 |
| 적재 데이터 커밋 | 시세 · 공시 원문은 크고 재생성 가능하다 |
| AI 서버 Ingress | `X-User-Id` 위조로 남의 데이터를 읽는다 |
| 파생 지표를 백엔드에서 받기 | 화면마다 값이 어긋난다 |
