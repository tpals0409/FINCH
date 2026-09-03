---
sprint: 4
title: "백엔드 원장"
date: "2026-09-04"
status: completed
parts: [backend, ai, infra, design]
related_adrs: ["sprint-3"]
topics: [원장, 계좌, 멱등성, 충전, 커서페이징, 불변식테스트, 와이어프레임]
tldr: "Sprint 3 이 미룬 원장을 구현했다. 스키마가 이미 서 있어 마이그레이션 0건·새 에러코드 0건이었고, 비어 있던 것은 서비스 계층뿐이었다. 잔액과 원장의 짝맞춤을 AccountService.postTo 하나에 가두고 원장 리포지토리에서 삭제 진입점을 없애 불변성을 매핑으로 지켰다. 멱등성은 ON CONFLICT DO NOTHING 예약과 셋으로 갈린 트랜잭션 경계로 구현했다. 불변식 테스트 24건이 멱등성 재생의 시각 오프셋 버그(+09:00→Z)를 잡았고, ddl-auto validate 가 CHAR(64) 매핑 오류를 잡았다. 이월 셋(npm test CI 연결·코퍼스 백업·위험 엔진 원인 규명)을 함께 해소했고, 그중 위험 엔진 이월은 전제 자체가 틀렸음을 실측으로 확인했다."
---
# Sprint 4 — 백엔드 원장

_날짜: 2026-09-04_

## 목표

Sprint 3 에서 미룬 원장을 구현한다. 검증 장치가 이제 다 있다 — CI 가 돌고, 멱등성 스키마가 서 있고,
불변식을 증명할 Testcontainers 가 붙는다.

착수 시점 실측에서 드러난 것은 **스키마와 계약이 코드보다 앞서 있다**는 사실이었다.
`account`·`ledger_entry`·`deposit`·`idempotency_record` 가 V1~V3 에 전부 있고, `DEPOSIT_*` 3종과
`IDEMPOTENCY_*` 3종도 apiSpec §11 과 이미 일치했다. 그래서 이번 스프린트는 **마이그레이션 0건,
새 에러 코드 0건**이고, 채운 것은 그 사이의 서비스 계층뿐이다.

## 결정 사항

### D1. 잔액과 원장의 짝맞춤을 한 메서드에 가둔다

`ledger_entry.cash_balance_after` 와 `account.cash_balance` 는 항상 같아야 한다. 이 짝을 호출자마다
맞추게 하면 **어긋날 자리가 호출자 수만큼** 생긴다.

`AccountService.postTo` 가 `account.applyCashDelta(delta)` 의 반환값을 그대로 `cash_balance_after` 로
넘긴다. 두 값이 같은 표현식에서 나오므로 갈라질 수 없다. `deposit`·`order` 는 `post()` 만 부르고
`LedgerService` 를 직접 부르지 않는다 — 부르면 잔액을 안 움직이고 원장만 쓸 수 있다.

backConvention 2.5 의 "기록 주체"(무엇을 기록할지 각 도메인이 결정)는 그대로 두고, 기계적인
짝맞춤만 `account` 가 갖는다. Sprint 3 교훈 "타입으로 막을 수 있으면 문서로 부탁하지 않는다" 의 적용이다.

**기각한 대안** — 호출자가 잔액을 읽어 더한 값을 계산해 넘기는 형태. 그 계산이 어긋날 자리가 된다.

### D2. 원장 리포지토리가 `JpaRepository` 를 상속하지 않는다

상속하면 `delete`·`deleteById`·`deleteAll`·`deleteAllInBatch` 가 공짜로 붙어 **원장 삭제 진입점이
생긴다.** 불변성(backConvention 6장)을 주석으로 부탁하는 대신, `Repository` 마커에서 시작해 필요한
메서드만 선언했다. 여기 없는 것이 곧 계약이고, `delete*` 나 `@Modifying` 을 추가하는 것 자체가
규약 위반이다. 테스트가 그것을 고정한다.

`LedgerEntry` 의 모든 컬럼은 `updatable = false` 다 — Hibernate 가 UPDATE 문에서 컬럼을 제외하므로
누가 필드를 바꿀 길을 찾아도 DB 에 닿지 않는다. 같은 이유로 `AccountRepository`·`DepositRepository` 도
`Repository` 마커를 쓴다 (계좌 삭제와 충전 취소는 어느 명세에도 없다).

### D3. 백필 마이그레이션 대신 로그인마다 계좌 존재를 확인한다

구현 중 발견: **기존 `users` 행에 계좌가 없다.** 원인이 둘이었다.

1. V2 가 카카오 로그인 검증 행을 보존했고, 그 사용자는 `created = false` 경로다
2. `users` INSERT 와 계좌 생성이 다른 트랜잭션이라(AuthService 주석) 사이에서 죽을 수 있다

V4 백필은 **첫째만** 고친다. `AccountService.openAccountIfAbsent` 를 `created` 조건 없이 모든
로그인에서 부르면 둘 다 고쳐지고, 실패했던 사용자가 다음 로그인에 스스로 회복한다.
대가는 로그인마다 SELECT 한 번이다. 한 번 고치는 것과 계속 고치는 것 중 후자를 골랐다.

`DataIntegrityViolationException` 은 `AuthService`(트랜잭션 밖)에서 잡는다. 트랜잭션 안에서 잡으면
rollback-only 로 표시돼 커밋에서 다시 실패한다 — `register` 가 `users` 에 대해 하는 것과 같은 구조다.

### D4. 멱등성 — 예약 INSERT 의 성패가 판정이고, 트랜잭션 경계가 셋으로 갈린다

`ON CONFLICT DO NOTHING` 의 반환 행수가 판정 그 자체다. JPA `save` 는 조회 후 INSERT 라 두 요청이
모두 "없음" 을 볼 수 있고(backConvention 5.3 이 명시적으로 기각), 예외로 판정하면 그 트랜잭션이
rollback-only 로 표시돼 이후 조회조차 못 한다.

경계가 셋으로 갈리는 것이 `IdempotencyStore` 와 `IdempotencyGuard` 를 나눈 이유다 — Spring 의 전파
속성은 프록시를 거친 호출에만 적용되므로 한 빈에 담으면 셋 다 무력화된다.

| 메서드 | 전파 | 왜 |
|---|---|---|
| `reserve` | `REQUIRES_NEW` | 독립 커밋해야 PK 충돌이 **대기가 아니라 판정**이 된다 |
| `complete` | `MANDATORY` | 원장 INSERT 와 한 트랜잭션. 갈라지면 원장에 행이 있는데 키는 미처리로 남는다 |
| `release` | `REQUIRES_NEW` | 롤백되는 트랜잭션에 얹으면 예약이 안 지워진다 |

`@Transactional` 은 가드에 두고 **본 처리를 블록으로 받는다.** 도메인 서비스가 자기 안의
`@Transactional` 메서드를 부르면 자기 호출이라 프록시를 거치지 않아 트랜잭션이 시작되지 않는다.
블록을 인자로 받으면 그 함정이 없고, `DepositService` 는 트랜잭션을 갖지 않아도 된다.

### D5. 커서 인코딩을 `{"id":N}` 의 Base64URL 로 확정

apiSpec 1.5 가 "서버 구현 상세" 로만 두고 방식을 정하지 않았다. 숫자만 넣으면 더 짧지만, 정렬 축이
둘인 목록(보유 종목의 평가금액순 등)이 생겼을 때 필드를 더할 수 없고 **옛 커서와 새 커서를 구분할
표식이 없어** 이전 커서가 조용히 잘못 페이징된다. `base64 -d` 로 읽히는 것도 디버깅에서 값어치가 있다.

`NULL` 파라미터를 쓰지 않는다. `:type IS NULL OR ...` 형태는 Postgres 가 파라미터 타입을 못 정해
캐스팅을 요구한다. `type` 은 `'ALL'` 센티넬을, 커서는 없을 때 `Long.MAX_VALUE` 를 받아 **분기 자체를
없앴다.** `hasNext` 는 `size + 1` 로 판정한다 — `COUNT` 를 두면 원장이 단조 증가하므로 스크롤 한 번에
전체를 n번 센다.

### D6. `trade`·`stock` 조인을 지금 넣지 않는다 (`ponytail:` 표시)

`type=BUY|SELL` 은 범위 밖이고 `trade` 가 0행이다. **0행에 대고 쓴 조인은 아무도 검증하지 못한
조인**이고, Sprint 3 이 정확히 그것으로 셋을 놓쳤다("빌드 통과 ≠ 뜬다"). 주문 스프린트가 실제 행을
가지고 조인과 `realizedProfitRate`(소수 둘째 반올림 — 100배 사고 지점)를 함께 붙인다.
그때 `amount` 도 `abs(cash_delta)` 에서 `trade.executed_amount` 로 옮기는 편이 정확하다.
응답 DTO 표면은 apiSpec 8.2 의 11필드로 지금 완성해 뒀다.

### D7. `evaluationAmount` 가 0 인 이유를 코드와 테스트에 남긴다

**보유가 없어서 0 이 아니라 `holding`·`price` 도메인이 없어서 0 이다.** 두 이유는 다르고, 후자는
주문이 붙어도 자동으로 안 고쳐진다. 테스트는 "0 이다" 가 아니라 **"현금과 총자산이 같다"** 를
고정한다 — 평가금액이 붙으면 그 테스트가 먼저 깨져 존재를 알린다.

## 구현

- **fe557bf** — 원장·계좌 엔티티와 기록 경로 (`ledger` 도메인, `Account`, `global/util/KstTime`)
- **52a8f1e** — 계좌 개설과 예수금 이동 (`AccountService`, `AuthService` 연결, `GET /account`)
- **f23f010** — 멱등성 가드 (`global/idempotency` 4파일)
- **5157fdc** — 충전 한도 조회와 충전 (`deposit` 도메인 전체)
- **04eefe9** — 내역 조회와 불변식 테스트 (`GET /transactions`, `Cursor`, `CursorPage`, 24건)
- **d53e9d6** — `npm test` 를 프론트 job 에 연결
- **49c8579** — 코퍼스 백업 절차와 위험 엔진 원인 기록, `backConvention` §2.2 정정
- **ba53530 · 98ea444 · ce0edab** — 와이어프레임 15 아트보드 (`design/sprint-4-wireframe`)

**규모(물리적 사실)**: 원장 40파일 +2,312/−32 · 와이어프레임 2파일 +855/−7

**검증(물리적 사실)**:

| 대상 | 결과 |
|---|---|
| backend (로컬) | **126 tests, 0 failures** — 기존 99 + AuthService 3 + 불변식 24 |
| backend (CI) | `BUILD SUCCESSFUL` |
| 스키마 대조 | `ddl-auto: validate` 통과 — 엔티티 5종이 V1~V3 와 일치 |
| 에러코드 계약 | `ErrorCodeContractTest` **수정 없이** 통과 (새 코드 0건) |
| frontend (로컬) | 3 files, **12 tests** (vitest 5.0.0) |
| frontend (CI) | `Run npm test` 스텝 로그 확인, 3 files passed |
| CI 전체 | PR #16 — ai·backend·frontend **전부 pass** |
| AI 백업 | 덤프 67MB. 복원본 = 원본 (documents 219 · chunks 10,198 · 임베딩 10,198/1,024차원 · instruments 2,598 · price_daily 8,594) |
| 와이어프레임 | 아트보드 **15**, 폰 프레임 14, 상태 화면 8 |
| 토큰 참조 | 사용 44종 전부 정의됨 — **dangling 0** |
| 토큰 해석 | `fg-neutral` → `#121417`, `bg-layer-basement` → `#f7f7f8` (폴백 아님) |
| 가로 오버플로 | **0** (390px·320px 양쪽) |
| APCA 대비 | **35/35** (sprint-3 과 동일, 토큰 무변경) |

불변식 24건은 계좌 개설 · 원장↔계좌 정합 · 한도 · 멱등성 · 페이징 · 불변성을 덮는다.

## 인시던트

1. **멱등성 재생 응답의 시각 오프셋이 `+09:00` 에서 `Z` 로 바뀌었다.** 같은 순간이지만 문자열이 달라
   apiSpec 1.4 의 "최초 결과를 그대로 반환" 이 깨진다. 프론트가 문자열을 그대로 띄우면 **재시도에서만
   날짜가 하루 밀린다** — 최초 응답은 멀쩡하므로 재현이 어려운 종류다. 불변식 테스트가 잡았다.
   Jackson 3 이 이 기능을 `DeserializationFeature` → `DateTimeFeature` 로 옮겨 `spring.jackson.*`
   프로퍼티로는 끌 수 없고(Boot 4.1 `JacksonProperties` 에 그 맵이 없다), `JsonMapperBuilderCustomizer`
   로 전역에 걸었다. 가드에만 걸지 않은 이유는 같은 뒤틀림이 **들어오는 요청에도** 적용되기 때문이다.

2. **`request_hash` 의 `CHAR(64)` 매핑이 두 단계로 틀렸다.** Hibernate 는 `String` 을 `varchar` 로
   매핑한다. `columnDefinition = "char(64)"` 를 줬더니 `found [bpchar], expecting [char(64) (Types#VARCHAR)]`
   로 여전히 막혔다 — `validate` 는 문자열이 아니라 **JDBC 타입 코드**를 비교한다. `@JdbcTypeCode(SqlTypes.CHAR)`
   가 답이었다. `stock_code CHAR(6)` 도 같은 처리가 필요하다.

3. **디자이너 에이전트가 Opus 529 로 두 번 연속 죽었다.** 첫 시도는 커밋 전이라 전부 날아갔다.
   세 번째 프롬프트에 "중간 커밋을 자주 하라 — 앞선 시도가 그렇게 날아갔다" 를 명시해 성공했다.
   Sprint 3 회고 4번(세션 한도)과 같은 실패 모드가 플랫폼 과부하로도 온다.

4. **이월 항목의 전제가 틀려 있었다.** 아래 별도 절.

## 이월 항목 검증 — "위험 엔진이 전부 None" 은 두 군데 틀렸다

Sprint 3 이 "seed 271일 재생성(위험 엔진이 지금 전부 `None`)" 을 이월했다. 실측(2026-09-04):

```
price_daily        8,594행 · 32종 · 268일 26종 + 271일 6종 · 종가 0/NULL 0건
공통 거래일        268일  (seed_portfolio 8종목의 교집합)
min_history_days   60
index_daily        0행   ← KOSPI 벤치마크
```

1. **시세 데이터는 충분하다.** 게이트는 `observed < settings.min_history_days` 이고 268일은 60일의
   네 배가 넘는다. `--days 400` 을 다시 돌리면 8초를 쓰고 아무것도 안 바뀐다.
2. **"전부 `None`" 이 아니라 `beta` 만이다.** `risk_score`·`risk_level` 은
   `volatility is not None and diversification is not None` 만 본다 — 베타는 §3.6 가중 5개
   구성요소에 들어가지 않는 보고용 지표다. `test_risk_engine.py` **107건 통과**도 엔진 자체에는
   문제가 없다는 뜻이다.

원인은 `index_daily` 0행 하나다. `worklog-2026-08-19.md` 가 484행(KOSPI)으로 기록했으니 적재됐다가
사라졌다. 복구는 `python -m ingest.krx index --days 730 --full` 한 줄이고 **차단 지점은 빈
`KRX_API_KEY`** 다. 그때까지 `beta: null` 은 데이터 결손이고 버그가 아니다.

## 이월

- **`KRX_API_KEY`** — 베타 복구의 유일한 차단 지점. `attribution.py` 도 같은 테이블을 읽으므로 키 하나가 두 엔진을 푼다
- **외부 API 키 4종** — KIS(다음 스프린트 전제) · DART · NAVER · ECOS
- **`stock_code CHAR(6)` 매핑** — 종목 엔티티를 만들 때 `@JdbcTypeCode(SqlTypes.CHAR)` 가 필요하다
- **멱등성 만료 배치** (backConvention §5.4) — 24시간 뒤 첫 만료라 이번 스프린트 안에 관측 불가였다
- **`GET /portfolio` · 주문 · 시세 · `trade`/`holding` 엔티티**
- `KAKAO_CLIENT_ID` 시크릿 · finch-gitops 의 bootstrap · SealedSecret · NetworkPolicy

## 교훈

- **불변식 테스트는 자기가 지키려던 것 말고 다른 것을 잡는다.** 24건은 원장 정합을 겨눴는데 실제로
  잡은 것은 시각 직렬화 버그였다. 재시도 경로에서만 나타나 최초 응답은 멀쩡한, 손으로는 못 찾을
  종류다. **경로가 하나뿐일 때 테스트를 박는 것이 싼 이유가 이것이다** — 그 테스트가 나중에 다른
  층의 버그를 잡는다.
- **이월 항목은 다시 재기 전까지 사실이 아니다.** "위험 엔진이 전부 None, seed 재생성 필요" 를
  그대로 실행했으면 8초를 쓰고 아무것도 안 고친 채 완료로 표시했을 것이다. 전제가 두 군데 틀렸고
  진짜 원인은 다른 테이블이었다. **이월을 받으면 먼저 재고 그 다음에 고친다.**
- **스키마가 코드보다 앞서면 마이그레이션이 0건이 된다.** Sprint 3 이 원장을 못 썼다고 했지만
  실제로는 가장 되돌리기 어려운 부분(스키마·계약·에러코드)을 이미 끝내 놓았다. 이번에 채운 것은
  서비스 계층뿐이다 — **"아무것도 못 했다" 는 회고가 실제로는 순서를 바꾼 것이었다.**
- **`ddl-auto: validate` 는 두 번 틀리게 해준다.** `columnDefinition` 으로 고쳤다고 믿은 뒤에도
  막혔고, 그 두 번째 메시지가 "JDBC 타입 코드를 비교한다" 를 알려줬다. 검사기가 한 번에 통과시키지
  않는 것이 정보다 — **첫 수정으로 통과했으면 잘못된 이유를 믿은 채 넘어갔다.**
- **에이전트에게 "중간 커밋" 을 지시하는 것으로 부족하다. 왜 필요한지 근거를 준다.** 세 번째
  프롬프트에만 "앞선 시도가 그렇게 날아갔다" 를 적었고 그것만 살아남았다.
