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
  - Java 21 유지 — Boot 4 최소 요구는 17이고 21은 LTS다
- 영속성 Spring Data JPA
- DB PostgreSQL 17 / 마이그레이션 Flyway
  - MySQL 8 기각 — AI 파트가 같은 인스턴스에서 pgvector를 필수로 쓴다(초기 마이그레이션이 `CREATE EXTENSION vector`를 실행하고, 벡터 검색은 종목 분석·채팅의 런타임 기능이다). MySQL을 따로 두면 2vCPU 노드에 DB 엔진이 둘 올라가고 EC2 이관 절차(`pg_dump` 일괄 덤프·복원)도 갈라진다
  - 인스턴스 1개 + DB 2개 — 백엔드 `moutoss_db` / AI `ai_invest`. 스키마 관리 도구가 달라(Flyway vs Alembic) DB를 나눠야 마이그레이션 이력이 충돌 없이 공존한다
  - 운영 이미지 `pgvector/pgvector:pg17` (infraSpec 결정 #10). `ddl-auto`는 `validate` 고정, 스키마 변경은 Flyway 전용 (infraSpec §3.2)
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

- `backend/src/main/java` 하위 패키지 구성과 각 패키지의 책임
- 도메인 단위 분할
- 도메인 간 참조 방향 규칙 (순환 참조 금지, 공통 모듈의 위치)

### 3. 네이밍 규칙

- 클래스: Controller · Service · Repository · Entity 접미사 규칙
- DTO: 요청/응답 구분 (`~Req` / `~Res`), record 사용 여부
- 메서드: 조회/생성/수정/삭제 동사 규칙
- DB: 테이블·컬럼 네이밍 (snake_case), 종목코드 컬럼 타입 **CHAR(6)** (정수 금지 — 선행 0 유실, apiSpec.md 1.1)
- 에러 코드: `도메인_원인` 대문자 스네이크 (apiSpec.md 10장 형식 유지)

### 4. 계층 경계

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
- 멱등성 키(apiSpec.md 1.4): 처리 위치(인터셉터 vs 서비스), 저장소(Redis), 24시간 TTL, `IDEMPOTENCY_CONFLICT` 판정 기준(요청 본문 해시)
- 커서 페이징(apiSpec.md 1.5): 공통 응답 타입, 커서 인코딩 방식 (12장 미확정 항목 — 여기서 제안하고 Sprint 0에서 확정)
- 검증: Bean Validation 사용 기준, `INVALID_REQUEST` 매핑
- 실시간 시세 STOMP(apiSpec.md 5.6): CONNECT 프레임의 `Authorization` 검증 위치(핸드셰이크가 아니다 — 브라우저 `WebSocket` 생성자가 커스텀 헤더를 못 붙인다), `/topic/prices/{stockCode}` 발행 주체, 하트비트 10초/10초와 30초 미수신 시 슬롯 회수 로직의 위치
- **replica 2개 환경의 STOMP 팬아웃 방식 확정** — 내장 SimpleBroker는 각 인스턴스가 자기 연결에만 발행한다. 시세 캐시(Redis)를 각 인스턴스가 읽어 자기 구독자에게 발행하는 구조인지 Redis Pub/Sub으로 팬아웃하는지 명시하지 않으면, 단일 인스턴스에서는 되고 배포 후 절반의 사용자만 시세를 받는 형태로 깨진다 (infraSpec §3.2 — Spring Boot replicas 2)

### 6. 데이터 표기 규약

- 금액·수량은 원 단위 정수 `long` (BigDecimal 금지 구간 명시)
- 시각은 ISO 8601 + KST 오프셋. 서버 내부 저장은 UTC인지 KST인지 확정해서 명시
- 등락률은 소수 둘째 자리 반올림 — 반올림 규칙과 계산 위치(서버)를 명시
- 종목코드는 6자리 문자열. DB·DTO·로그 전 구간에서 문자열 유지
- 원장(transaction)은 **불변**: UPDATE·DELETE 금지, 정정은 반대 분개로

### 7. 도메인 규약

- 원장 유형 6종(`INITIAL_GRANT` ~ `ROUND_CLOSE`)의 기록 시점과 책임 서비스
- 주문 처리 순서(apiSpec.md 7.2의 5단계)를 코드 어디에 두는지 — 수량 임의 축소 체결 금지
- 회차 규칙: 쓰기는 활성 회차만, `ROUND_READ_ONLY` 판정 위치
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
- [ ] MR 생성 후 BE 팀원 리뷰 요청

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
