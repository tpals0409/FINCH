# [BE] 백엔드 개발 컨벤션 작성

## 배경

- BE 인원이 병렬로 작업하려면 착수 전에 규약이 있어야 한다.
- 합의 없이 병렬로 가면 같은 예외 처리 로직이 컨트롤러마다 다르게 생기고, 나중에 합치는 비용이 더 크다.
- `apiSpec.md` v0.1이 응답 형식·멱등성·페이징 등 **계약**은 정의했지만, 그것을 **코드로 어떻게 구현할지**(패키지 구조, 계층 책임, 예외 처리 위치)는 정의하지 않았다. 이 문서가 그 간극을 메운다.

## 작업 내용

`docs/convention/backConvention.md` 에 아래 항목을 작성한다.

### 1. 기술 스택과 선정 근거

- Java 21 + Spring Boot 3.x
- 영속성 Spring Data JPA
- DB MySQL 8 / 마이그레이션 Flyway
- 캐시·멱등성 키 저장 Redis
- 인증 Spring Security + JWT, 카카오 OAuth
- 외부 연동(KIS·AI 서버) WebClient
- API 문서 springdoc-openapi (→ `openapi.yaml` 산출, apiSpec.md 13장)
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

- KIS 시세: 앱키 1개 기준 **동시 41슬롯** 관리 방식, 초과분 폴링 폴백 전환 로직의 위치
- `stale` 판정: 마지막 수신 시각 기준, 허용 시간은 `[S0-3]` 확정 전까지 상수로 분리
- 재시도·타임아웃: WebClient 공통 설정, 429 Retry-After 준수
- AI 서버 내부 API(`/internal/v1`): `X-Internal-Token` 검증 위치, 외부 노출 차단 방법(네트워크 vs 필터), **읽기 전용 보장** (AI는 원장을 쓰지 않는다, 명세 10.1)
- AI 명세 SSE: 백엔드가 프록시하는지 AI 서버 직결인지 확정하고, 프록시라면 버퍼링 없이 통과시키는 설정 명시

## 완료 조건

- [ ] 각 기술 선택에 기각한 대안과 이유가 적혀 있다
- [ ] BE 인원이 문서만 읽고 패키지 위치와 클래스명을 정할 수 있다
- [ ] MR 생성 후 BE 팀원 리뷰 요청

## 참고

- `docs/convention/gitConvention.md` — 브랜치·커밋 규칙 (중복 서술 금지)
- `docs/convention/frontConvention.md` — 데이터 표기 규약(6장)은 FE 문서와 값이 일치해야 한다 (비율·금액·종목코드·등락 색)
- `docs/api/apiSpec.md` — 응답 형식·멱등성·페이징·에러 코드의 계약 원본. 이 문서와 충돌 금지
- 확정 조건: 시장가 즉시 체결(접수·체결 미분리), 거래 시간 09:00~15:30 KST, 초기 예수금 100만 원
- 시세는 KIS 앱키 1개 기준 동시 41슬롯. 초과분은 폴링 폴백

## 범위 밖

- Spring Boot 프로젝트 초기화 및 의존성 설치 → 별도 티켓
- DB 스키마(ERD) 확정 → 별도 티켓
- OpenAPI 3.0 문서(`openapi.yaml`) 작성 → apiSpec.md 13장, Sprint 0 확정 후 별도 티켓
- 인프라·배포 구성(CI/CD, 모니터링) → 별도 티켓
