# [BE] 백엔드 개발 컨벤션 작성

## 배경

- BE 인원이 병렬로 작업하려면 착수 전에 규약이 있어야 한다.
- 합의 없이 병렬로 가면 같은 예외 처리 로직이 컨트롤러마다 다르게 생기고, 나중에 합치는 비용이 더 크다.
- `apiSpec.md` v0.1이 응답 형식·멱등성·페이징 등 **계약**은 정의했지만, 그것을 **코드로 어떻게 구현할지**(패키지 구조, 계층 책임, 예외 처리 위치)는 정의하지 않았다. 이 문서가 그 간극을 메운다.

## 작업 내용

`docs/convention/backConvention.md` 에 아래 항목을 작성한다.

### 1. 기술 스택과 선정 근거

- Java 21 + Spring Boot 4.1.x (착수 시점 최신 4.1.1)
  - 3.x 기각 — 3.5가 2026-06-30 오픈소스 EOL(최종 패치 3.5.16)이라 신규 프로젝트가 고를 수 있는 지원 라인은 4.0(2026-12-31 EOL)과 4.1뿐이다
  - Boot 4는 Spring Framework 7 기반이므로 3.x용 라이브러리를 그대로 가져오면 기동에 실패할 수 있다. 의존성 추가 시 Boot 4 호환 여부를 확인한다
  - Kotlin (JVM 21 툴체인) — Boot 4 최소 요구는 17이고 21은 LTS다
- 영속성 Spring Data JPA
- DB PostgreSQL 17 / 마이그레이션 Flyway
  - MySQL 8 기각 — AI 파트가 같은 인스턴스에서 pgvector를 필수로 쓴다(초기 마이그레이션이 `CREATE EXTENSION vector`를 실행하고, 벡터 검색은 종목 분석·채팅의 런타임 기능이다). MySQL을 따로 두면 2vCPU 노드에 DB 엔진이 둘 올라가고 EC2 이관 절차(`pg_dump` 일괄 덤프·복원)도 갈라진다
  - 인스턴스 1개 + DB 2개 — 백엔드 `finch_db` / AI `ai_invest`. 스키마 관리 도구가 달라(Flyway vs Alembic) DB를 나눠야 마이그레이션 이력이 충돌 없이 공존한다
  - 운영 이미지 `pgvector/pgvector:pg17` (infraSpec† 결정 #10). `ddl-auto`는 `validate` 고정, 스키마 변경은 Flyway 전용 (infraSpec† §3.2)

> † **`infraSpec` 은 이 저장소에 없다.** SSAFY 팀 저장소에 있던 인프라 명세이고 ver2 로 옮겨오지 않았다.
> 위 항목들이 무엇을 근거로 정해졌는지가 사라지지 않도록 참조는 남긴다. 배포 구성의 현재 사실은
> `infra/CLAUDE.md` 와 finch-gitops 가 갖고 있고, 둘이 어긋나면 그쪽이 진실이다.

- 캐시·멱등성 키 저장 Redis
- 인증 Spring Security + JWT, 카카오 OAuth
  - OAuth2 Client 기각 — apiSpec.md 2.1의 계약은 프론트가 인가 코드를 받아 `POST /auth/kakao`로 넘기는 구조다. Spring Security의 리다이렉트 로그인 플로우를 쓰지 않으므로, 카카오 토큰 교환은 HTTP 클라이언트로 직접 호출한다
- 외부 연동(KIS·AI 서버) WebClient
- 실시간 시세 전송 Spring WebSocket + STOMP (apiSpec.md 5.6 확정)
  - 폴링 전용 기각 — 폴링은 폴백 경로로 남기되 최종 구조는 STOMP다. 두 경로의 시세 페이로드 스키마는 동일하다
- API 문서 springdoc-openapi (→ `openapi.yaml` 산출, apiSpec.md 13장) — Boot 4 호환 버전 확인 필요
- 테스트 JUnit 5 + Testcontainers
- **각 항목에 기각한 대안과 이유를 함께 적는다**

### 2. 패키지 구조

기준: [ERD v1.0](../erd/erd.md)의 11개 테이블과 [apiSpec v0.2](../api/apiSpec.md)의 엔드포인트 묶음.

#### 2.1 전체 트리

```
com.finch
├── FinchApplication.kt
├── global/                     # 도메인에 속하지 않는 것만. 도메인을 참조하지 않는다
│   ├── apiPayload/
│   │   ├── ErrorResponse.kt
│   │   └── code/               # BaseErrorCode, GeneralErrorCode
│   ├── config/                 # Security · Jpa · Redis · WebSocket · Swagger 설정
│   ├── exception/              # CustomException, AiRelayException, GlobalExceptionHandler
│   ├── security/               # JWT 발급·검증, 인증 필터, 로그인 사용자 주입
│   └── util/
└── domain/
    ├── auth/                   # 카카오 로그인, 토큰 회전, 내 정보
    ├── account/                # 계좌 (계정당 하나). 예수금 보유
    ├── deposit/                # 모의 충전
    ├── ledger/                 # 원장 기록 + 거래 내역 조회
    ├── stock/                  # 종목 마스터, 검색, 일봉
    ├── price/                  # 시세 캐시 읽기, STOMP 발행, KIS 수집
    ├── order/                  # 주문 체결
    ├── portfolio/              # 보유 종목, 잔고·평가손익
    ├── watchlist/              # 관심 종목
    ├── recent/                 # 최근 본 종목, 최근 검색어
    └── ai/                     # AI 중계 + 내부 연동 API 제공
```

#### 2.2 도메인과 소유 테이블

한 테이블은 정확히 한 도메인이 소유한다. 소유 도메인만 그 테이블의 Entity·Repository를 가진다.

| 도메인 | 소유 테이블 | 담당 엔드포인트 (apiSpec 장) |
|---|---|---|
| `auth` | `users` | 2장 전체 (`/auth/**`, `/users/me`) |
| `account` | `account` | 3장 (`/account`) |
| `deposit` | `deposit` | 4장 (`/deposits`, `/deposits/limit`) |
| `ledger` | `ledger_entry` | 8.2 (`/transactions`) |
| `stock` | `stock`, `daily_candle` | 5.1~5.3 (검색·상세·캔들) |
| `price` | 없음 (Redis) | 5.4~5.6 (`/price`, `/prices`, STOMP `/ws`) |
| `order` | `trade` | 7장 (`/orders`, `/orders/available`) |
| `portfolio` | `holding` | 8.1 (`/portfolio`) |
| `watchlist` | `watchlist_item` | 6장 관심 종목 |
| `recent` | `recent_viewed_stock`, `recent_search_keyword` | 6장 최근 본·최근 검색어 |
| `ai` | 없음 | 9장(`/internal/v1/**`), 10장(`/api/v1/ai/**`) |

Refresh Token과 멱등성 키는 Redis에 있고 테이블이 없다 (ERD §1.4). Refresh Token은 `global/security`,
멱등성 키는 `global/config`의 인터셉터가 다룬다 — 특정 도메인의 관심사가 아니다.

#### 2.3 도메인 내부 계층

```
domain/order/
├── controller/OrderController.kt
├── service/OrderService.kt
├── repository/TradeRepository.kt
├── entity/Trade.kt
├── dto/
│   ├── request/OrderCreateReq.kt
│   └── response/OrderRes.kt
└── exception/OrderErrorCode.kt      # BaseErrorCode 구현
```

도메인 고유 에러 코드는 `global`이 아니라 해당 도메인의 `exception/`에 둔다. `global/apiPayload/code`에는
어느 도메인에도 속하지 않는 `GeneralErrorCode`만 남는다.

#### 2.4 참조 방향 규칙

**규칙 1 — `global`은 `domain`을 참조하지 않는다.** 방향은 항상 `domain → global` 한쪽이다.

**규칙 2 — 도메인 간 참조는 아래 순서의 위에서 아래로만 한다.** 역방향과 같은 층 사이의 참조는 순환을
만들 수 있으므로 금지한다.

```
1층 (피참조 전용)   stock      price      ledger
2층                 auth       account
3층                 portfolio
4층                 deposit    order      watchlist    recent
5층                 ai
```

- `order`는 `account`(예수금 락) · `ledger`(원장 기록) · `portfolio`(보유 갱신) · `price`(최신가) · `stock`(거래정지)을 참조한다
- `deposit`은 `account`와 `ledger`를 참조한다
- `ai`는 `portfolio`와 `order`를 읽어 내부 API로 노출한다 (읽기 전용, 원장을 쓰지 않는다 — featureSpec 10.1)
- `ledger`·`stock`·`price`는 다른 도메인을 참조하지 않는다

**규칙 3 — 참조는 다른 도메인의 Service를 통해서만 한다.** 다른 도메인의 Entity·Repository를 import
하지 않는다. 데이터가 필요하면 그 도메인이 노출한 DTO를 받는다.

**규칙 4 — 조회 전용 쿼리는 테이블을 조인할 수 있다.** `/transactions`는 `ledger_entry`·`deposit`·`trade`·
`stock`을 함께 읽어야 하는데(ERD §5), 이때 `ledger`가 다른 도메인의 Entity를 import하는 대신 **DTO
프로젝션으로 조인 결과만 받는다.** 규칙 3을 지키면서 N+1도 피하는 방법이다.

#### 2.5 원장 기록의 단일 경로

`ledger_entry`에 4종을 기록하는 주체를 고정한다 (backConvention 7장의 "기록 시점과 책임 서비스").

| `type` | 기록 주체 |
|---|---|
| `INITIAL_GRANT` | `account` |
| `DEPOSIT` | `deposit` |
| `BUY` · `SELL` | `order` |

`ledger`는 기록용 서비스 하나만 노출하고 스스로 원장을 만들지 않는다. **`LedgerRepository`를 `ledger`
밖에서 직접 부르는 코드가 생기면 원장 불변성을 지킬 지점이 흩어진다.**

#### 2.6 결정과 기각한 대안

- **계층 우선 분할(`controller/`·`service/`·`repository/`를 최상위로) 기각** — 기능 하나를 만들 때
  네 디렉터리를 오가고, BE 인원이 병렬로 작업하면 같은 디렉터리에서 계속 충돌한다.
- **`holding`을 별도 도메인으로 두지 않고 `portfolio`가 소유** — `holding`은 포트폴리오의 상태 그
  자체다. `order`가 체결 트랜잭션에서 `portfolio`의 서비스를 통해 갱신한다.
- **`order`와 `trade`를 나누지 않음** — 시장가 즉시 체결이라 주문 1건 = `trade` 1행이다 (ERD §2.5).
  지정가가 들어오면 `order` 도메인 안에서 테이블을 나눈다.
- **`price`를 `stock`에 합치지 않음** — `stock`은 DB를 읽고 `price`는 Redis·KIS·STOMP를 다룬다.
  더구나 시세 워커는 별도 Deployment로 배포되므로(infraSpec† §3.2) 경계를 지금 그어두는 편이 낫다.
  ⚠️ **워커를 같은 jar에서 프로파일로 띄울지 별도 모듈로 뺄지는 아직 미결이다.**
- **`/transactions`를 `portfolio`가 아니라 `ledger`에 둠** — apiSpec 8장이 `/portfolio`와 묶어 두었지만
  읽는 대상이 원장이다. 소유권을 API 장 번호보다 데이터 기준으로 정했다.

### 3. 네이밍 규칙

- 클래스: Controller · Service · Repository · Entity 접미사 규칙
- DTO: 요청/응답 구분 (`~Req` / `~Res`), record 사용 여부
- 메서드: 조회/생성/수정/삭제 동사 규칙
- DB: 테이블·컬럼 네이밍 (snake_case), 종목코드 컬럼 타입 **CHAR(6)** (정수 금지 — 선행 0 유실, apiSpec.md 1.1)
- 에러 코드: `도메인_원인` 대문자 스네이크 (apiSpec.md 10장 형식 유지)

### 4. 계층 경계

> **아래는 규약이 아니라 "이런 걸 적어라" 는 목차다.** §2(패키지 구조)와 §5.3·§5.4(멱등성)만
> 실제 규약이고 나머지는 정해지는 대로 채운다. 목차를 규약으로 읽으면 "규칙이 없다" 로 오해한다.


- Controller / Service / Repository 의 책임과 금지 사항
  (Controller에 비즈니스 로직 금지, Repository 직접 호출 계층 제한 등)
- Entity ↔ DTO 변환 위치 (Entity를 Controller 밖으로 내보내지 않는다)
- 트랜잭션 경계: `@Transactional` 을 어느 계층에 두는지
- **주문 체결(apiSpec.md 7.2)의 "원장 기록 + 잔고 반영 단일 트랜잭션" 을 이 규칙으로 어떻게 보장하는지 명시**
- 동시성 제어 방침: 동시 주문 시 예수금 음수 방지

### 5. API 규약 구현

- 응답: 성공 시 봉투 없음, 실패 시 `{ code, message, detail }`
- 예외 처리: `@RestControllerAdvice` 단일 진입점, 에러 코드 Enum 관리 위치
  (개별 컨트롤러 try-catch 금지 — `message` 는 서버가 완성해서 내려준다)
- 멱등성 키(apiSpec.md 1.4): **확정. 아래 §5.3·§5.4 참고**

#### 5.3 멱등성 처리 절차 — 확정

저장소는 **Postgres `idempotency_record`** 다 (`V3__add_idempotency.sql`). Redis 를 기각한 이유는
그 마이그레이션 머리말에 있다 — 요약하면 **원장 INSERT 와 키 표시가 한 트랜잭션이어야** 하고,
두 저장소로 갈라지면 그 사이에서 죽었을 때 중복 주문이 난다.

**판정의 출발점은 조회가 아니라 예약 INSERT 의 성패다.** 조회 후 INSERT 는 두 요청이 동시에
"없음" 을 볼 수 있지만 PK `(user_id, idempotency_key)` 는 정확히 하나만 통과시킨다.

| 상황 | 판정 | 응답 |
|---|---|---|
| 헤더 누락 | DB 에 닿기 전 | `400 IDEMPOTENCY_KEY_REQUIRED` |
| 처음 보는 키 | 예약 INSERT 성공 | 본 처리 → 같은 트랜잭션에서 `COMPLETED` |
| 처리 진행 중 | PK 충돌 · 행이 `IN_PROGRESS` | `409 IDEMPOTENCY_IN_PROGRESS` |
| 완료 · 동일 본문 | PK 충돌 · `COMPLETED` · `request_hash` 일치 | 저장된 응답을 **그대로 재생** (같은 상태 코드) |
| 완료 · 다른 본문 | PK 충돌 · `COMPLETED` · `request_hash` 불일치 | `409 IDEMPOTENCY_CONFLICT` |

- 처리 위치는 **서비스**다. 인터셉터에 두면 예약과 본 처리가 다른 트랜잭션이 되어 위 성질이 깨진다
- `request_hash` 는 정규화한 요청 본문의 SHA-256 소문자 hex. 경로는 해시에 섞지 않고 `endpoint` 컬럼으로 분리한다 — 막힌 `IN_PROGRESS` 행을 사람이 볼 때 어느 엔드포인트인지 알 유일한 단서다
- **처리가 실패하면 `COMPLETED` 로 남기지 않고 예약 행을 지운다.** 남기면 실패한 요청이 24시간 동안 재시도 불가가 된다
- `ck_idempotency_completed` 가 "완료 = 응답과 원장 행이 있다" 를 DB 사실로 만든다

#### 5.4 멱등성 레코드 만료 — 확정

보관 기간은 24시간이다 (apiSpec 1.4). **만료는 배치 하나로만 치운다.** 조회 시점에 지우지 않는다 —
읽기 경로에 쓰기를 섞으면 조회가 잠금을 잡고, 그 잠금이 본 처리와 경합한다.

`expires_at` 컬럼을 두지 않고 `created_at` 으로 계산한다. 보관 기간이 행마다가 아니라
**배치의 interval 한 곳에만** 있어야 나중에 바꿀 때 옛 행과 새 행이 갈리지 않는다.
인덱스는 `ix_idempotency_created` 다.

- 커서 페이징(apiSpec.md 1.5): 공통 응답 타입, 커서 인코딩 방식 (12장 미확정 항목 — 여기서 제안하고 Sprint 0에서 확정)
- 검증: Bean Validation 사용 기준, `INVALID_REQUEST` 매핑
- 실시간 시세 STOMP(apiSpec.md 5.6): CONNECT 프레임의 `Authorization` 검증 위치(핸드셰이크가 아니다 — 브라우저 `WebSocket` 생성자가 커스텀 헤더를 못 붙인다), `/topic/prices/{stockCode}` 발행 주체, 하트비트 10초/10초와 30초 미수신 시 슬롯 회수 로직의 위치
- **replica 2개 환경의 STOMP 팬아웃 방식 확정** — 내장 SimpleBroker는 각 인스턴스가 자기 연결에만 발행한다. 시세 캐시(Redis)를 각 인스턴스가 읽어 자기 구독자에게 발행하는 구조인지 Redis Pub/Sub으로 팬아웃하는지 명시하지 않으면, 단일 인스턴스에서는 되고 배포 후 절반의 사용자만 시세를 받는 형태로 깨진다 (infraSpec† §3.2 — Spring Boot replicas 2)

### 6. 데이터 표기 규약

- 금액·수량은 원 단위 정수 `long` (BigDecimal 금지 구간 명시)
- 시각은 ISO 8601 + KST 오프셋. 서버 내부 저장은 UTC인지 KST인지 확정해서 명시
- 등락률은 소수 둘째 자리 반올림 — 반올림 규칙과 계산 위치(서버)를 명시
- 종목코드는 6자리 문자열. DB·DTO·로그 전 구간에서 문자열 유지
- 원장(transaction)은 **불변**: UPDATE·DELETE 금지, 정정은 반대 분개로

### 7. 도메인 규약

- 원장 유형 4종(`INITIAL_GRANT`·`DEPOSIT`·`BUY`·`SELL`)의 기록 시점과 책임 서비스
- 주문 처리 순서(apiSpec.md 7.2의 5단계)를 코드 어디에 두는지 — 수량 임의 축소 체결 금지
- 계좌 요약·평가손익은 원장에서 계산한 서버 값 — 계산식의 단일 소스 위치

### 8. 외부 연동 규약

- KIS 시세: 실시간 등록 한도 관리 방식(서버 전체 LRU 배정)과 초과분 REST 폴링 전환 로직의 위치. **한도 수치는 `[S0-1]` 실측 대기이고 41은 가정값이다** — 상수로 분리하고 수치에 의존하는 로직을 만들지 않는다 (apiSpec.md 5.6)
- `stale` 판정: 마지막 수신 시각 기준, 허용 시간은 `[S0-3]` 확정 전까지 상수로 분리
- 재시도·타임아웃: WebClient 공통 설정, 429 Retry-After 준수
- AI 서버 내부 API(`/internal/v1`): `X-Internal-Token` 검증 위치, 외부 노출 차단 방법(네트워크 vs 필터), **읽기 전용 보장** (AI는 원장을 쓰지 않는다, 명세 10.1)
- AI 중계(apiSpec.md 10장): **SSE는 폐기됐다** — AI 6종은 전부 일반 요청/응답이고 프론트는 AI 서버를 직접 부르지 않는다. 응답 정규화(AI `snake_case` + 공통 봉투 → 백엔드 `camelCase` + 봉투 없음) 위치와, **AI 장애를 백엔드 자체 장애와 구분할 에러 코드 체계**를 명시 (구분이 없으면 프론트가 AI 블록만 죽이는 에러 경계를 만들 수 없다)

## 완료 조건

- [ ] 각 기술 선택에 기각한 대안과 이유가 적혀 있다
- [ ] BE 인원이 문서만 읽고 패키지 위치와 클래스명을 정할 수 있다
- [ ] PR 을 열고 CI 가 녹색이면 squash 머지

## 참고

- `docs/convention/gitConvention.md` — 브랜치·커밋 규칙 (중복 서술 금지)
- `docs/convention/frontConvention.md` — 데이터 표기 규약(6장)은 FE 문서와 값이 일치해야 한다 (비율·금액·종목코드·등락 색)
- `docs/api/apiSpec.md` — 응답 형식·멱등성·페이징·에러 코드의 계약 원본. 이 문서와 충돌 금지
- 확정 조건: 시장가 즉시 체결(접수·체결 미분리), 거래 시간 09:00~15:30 KST, 초기 예수금 100만 원
- 시세는 KIS 앱키 1개 기준 실시간 등록 한도 + 초과분 REST 폴링 폴백. 한도 수치는 `[S0-1]` 실측 대기 (41은 가정값)

## 범위 밖

- Spring Boot 프로젝트 초기화 및 의존성 설치 → 별도 티켓
- DB 스키마(ERD) 확정 → 별도 티켓
- OpenAPI 3.0 문서(`openapi.yaml`) 작성 → apiSpec.md 13장, Sprint 0 확정 후 별도 티켓
- 인프라·배포 구성(CI/CD, 모니터링) → 별도 티켓
