-- 멱등성 레코드를 Postgres 에 둔다 (apiSpec 1.4). 그리고 종목코드 형식을 DB 가 강제한다.
--
-- ---------------------------------------------------------------------------
-- 왜 Redis 가 아닌가
-- ---------------------------------------------------------------------------
--
-- RefreshTokenStore 는 Redis 에 있고 그 선택의 전제는 "재기동 = 전원 재로그인, 감수한다" 였다.
-- 멱등성 키는 감수 수준이 다르다. Redis 를 재기동하면 그 순간 모든 충전·주문 키가 다시
-- "처음 보는 키" 가 되고, 재시도 중이던 요청이 그대로 두 번째 충전·두 번째 주문이 된다.
-- 재로그인은 사용자가 알아채고 다시 하면 되지만 중복 주문은 되돌릴 방법이 없다 — 원장은 불변이라
-- 정정도 반대 분개로만 되고, 그 사이 시세는 이미 움직였다.
--
-- 더 결정적인 이유는 **원자성**이다. 멱등성 레코드가 Redis 에 있으면 "원장을 썼다" 와
-- "그 키를 처리 완료로 표시했다" 가 서로 다른 저장소의 서로 다른 커밋이 된다. 둘 사이에서 죽으면
-- 원장에는 행이 있는데 키는 미처리로 남고, 다음 재시도가 같은 주문을 한 번 더 낸다.
-- 같은 DB 에 두면 그 둘이 한 트랜잭션이라 갈라질 창 자체가 없다.
--
--
-- ---------------------------------------------------------------------------
-- 다섯 상황(apiSpec 1.4)이 이 스키마에서 어떻게 갈리는가
-- ---------------------------------------------------------------------------
--
--   헤더 누락            DB 에 닿기 전. 인터셉터가 400 IDEMPOTENCY_KEY_REQUIRED
--   처음 보는 키         예약 INSERT 성공 → 본 처리 → 같은 트랜잭션에서 COMPLETED
--   처리 진행 중         예약 INSERT 가 PK 충돌 → 찾은 행이 IN_PROGRESS → 409 IDEMPOTENCY_IN_PROGRESS
--   완료 · 동일 본문     예약 INSERT 가 PK 충돌 → COMPLETED + request_hash 일치 → 저장된 응답 재생
--   완료 · 다른 본문     예약 INSERT 가 PK 충돌 → COMPLETED + request_hash 불일치 → 409 IDEMPOTENCY_CONFLICT
--
-- 판정의 출발점이 애플리케이션의 "먼저 조회해 보고 없으면 처리" 가 아니라 **INSERT 의 성패**다.
-- 조회 후 INSERT 는 두 요청이 동시에 "없음" 을 볼 수 있지만, INSERT 는 PK 가 정확히 하나만
-- 통과시킨다. 진 쪽은 본 처리 트랜잭션에 들어가지도 못한다.
--
-- 사용 절차의 상세는 backConvention.md §5.3 에 있다. 이 파일은 그 절차가 기대는 성질만 만든다.


-- ---------------------------------------------------------------------------
-- idempotency_record — 충전·주문의 멱등성 키
-- ---------------------------------------------------------------------------

CREATE TABLE idempotency_record (
    -- 키를 사용자에 가둔다. 전역 UNIQUE 로 두면 한 사용자가 쓴 키를 다른 사용자가 못 쓰게 되고,
    -- 남의 키 존재 여부가 응답으로 새어 나간다. UUID v4 라 충돌이 없더라도 경계는 그어 둔다.
    user_id         BIGINT       NOT NULL,
    -- 클라이언트가 만든다 (apiSpec 1.4). UUID v4 를 기대하지만 형식을 강제하지 않는다 —
    -- UUID 타입으로 두면 형식이 틀린 키가 400 이 아니라 500 이 되고, 그 400 의 코드는 §11 에 없다.
    idempotency_key VARCHAR(64)  NOT NULL,
    -- 같은 키를 다른 엔드포인트에 쓴 경우를 가른다. 완료된 행에서 이 값이 다르면 다른 요청이다.
    -- 본문 해시에 경로를 섞지 않고 컬럼으로 분리해 둔 이유는, 막힌 IN_PROGRESS 행을 사람이 볼 때
    -- 어느 엔드포인트인지 알 수 있는 유일한 단서이기 때문이다 (해시는 사람이 읽을 수 없다).
    endpoint        VARCHAR(64)  NOT NULL,
    -- 정규화한 요청 본문의 SHA-256 (소문자 hex 64자). 동일 요청과 다른 요청을 가르는 유일한 근거다.
    request_hash    CHAR(64)     NOT NULL,
    status          VARCHAR(11)  NOT NULL,
    -- 완료 시 재생할 응답. 재생은 최초와 같은 상태 코드·본문이어야 한다 (apiSpec 1.4).
    -- 본문을 저장하지 않고 원장에서 다시 만들면 엔드포인트마다 재생 경로를 따로 짜야 한다.
    -- JSONB 는 키 순서를 보존하지 않지만 응답 계약(§1.3)에 키 순서가 없으므로 문제되지 않고,
    -- 대신 JSON 이 아닌 문자열이 저장되는 것을 DB 가 막아 준다.
    response_status SMALLINT,
    response_body   JSONB,
    -- 이 키가 만든 원장 행. 본 처리 트랜잭션에서 원장 INSERT 와 함께 채워진다.
    ledger_entry_id BIGINT,
    created_at      TIMESTAMPTZ  NOT NULL,

    -- 동시 요청을 여기서 직렬화한다. 이 제약이 "같은 키로 두 번 → 원장 행이 안 는다" 의 근거다.
    CONSTRAINT pk_idempotency            PRIMARY KEY (user_id, idempotency_key),
    CONSTRAINT fk_idempotency_user       FOREIGN KEY (user_id)         REFERENCES users (id),
    CONSTRAINT fk_idempotency_ledger     FOREIGN KEY (ledger_entry_id) REFERENCES ledger_entry (id),
    -- 원장 1행 : 키 1개. 두 키가 같은 원장 행을 자기 결과라고 주장할 수 없다.
    -- 위의 PK 와 짝을 이뤄 키와 원장 행이 1:1 임을 DB 가 보장한다.
    CONSTRAINT uq_idempotency_ledger     UNIQUE (ledger_entry_id),
    CONSTRAINT ck_idempotency_key_len    CHECK (length(idempotency_key) BETWEEN 8 AND 64),
    CONSTRAINT ck_idempotency_hash       CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_idempotency_status     CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    -- 완료는 응답과 원장 행을 반드시 갖는다. 멱등성이 필요한 두 엔드포인트(충전·주문)가 둘 다
    -- 원장에 정확히 1행을 쓰기 때문이고, 이 CHECK 가 "완료 = 원장에 행이 있다" 를 DB 사실로 만든다.
    -- 실패한 처리는 COMPLETED 로 남기지 않고 예약 행을 지운다 (backConvention §5.3).
    CONSTRAINT ck_idempotency_completed  CHECK (
        (status = 'COMPLETED'   AND response_status IS NOT NULL
                                AND response_body   IS NOT NULL
                                AND ledger_entry_id IS NOT NULL)
     OR (status = 'IN_PROGRESS' AND response_status IS NULL
                                AND response_body   IS NULL
                                AND ledger_entry_id IS NULL)
    )
);

-- 24시간 보관. 만료 레코드는 **배치 하나로만** 치운다 (backConvention §5.4).
-- expires_at 컬럼을 두지 않고 created_at 으로 계산한다 — 보관 기간이 행마다가 아니라
-- 한 곳(배치의 interval)에만 있어야 나중에 바꿀 때 옛 행과 새 행이 갈리지 않는다.
CREATE INDEX ix_idempotency_created ON idempotency_record (created_at);


-- ---------------------------------------------------------------------------
-- stock — 종목코드 형식 강제
-- ---------------------------------------------------------------------------

-- CHAR(6) 은 짧은 값을 공백으로 채워 6자리로 만든다. '12345' 를 넣으면 '12345 ' 가 저장되고
-- JDBC 는 그 공백까지 읽어 온다 — apiSpec 1.1 이 금지한 "종목코드 훼손" 이 정수형이 아니라
-- 이 경로로도 일어난다. 비교는 bpchar 규칙상 뒤 공백을 무시해 SQL 에서는 멀쩡해 보이고,
-- 깨지는 것은 응답에 실려 나간 문자열뿐이라 발견이 늦다.
--
-- bpchar 를 text 로 캐스팅하면 뒤 공백이 잘리므로 이 정규식이 정확히 그 경우를 잡는다.
-- KOSPI·KOSDAQ 주식 단축코드는 6자리 숫자다 (ck_stock_market 이 시장을 이 둘로 제한한다).
--
-- trade·holding 의 stock_code 에는 걸지 않는다. 둘 다 stock 을 FK 로 참조하므로
-- 여기 없는 값은 애초에 들어가지 못한다. 제약은 값이 처음 생기는 자리 하나에만 둔다.
--
-- stock 은 아직 어느 환경에서도 비어 있다 (엔티티가 없고 마스터 적재 배치도 없다).
ALTER TABLE stock
    ADD CONSTRAINT ck_stock_code_format CHECK (stock_code ~ '^[0-9]{6}$');
