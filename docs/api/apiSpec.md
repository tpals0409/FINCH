# 백엔드 API 명세서

- 문서 버전: v0.1 (초안)
- 작성일: 2026-08-20
- 기준 문서: [기능 명세서 v2.1](../spec/featureSpec.md)
- 범위: MVP 백엔드 API 전체. 프론트엔드가 Mock을 만들 수 있는 수준의 계약을 목표로 한다.

> **이 문서의 성격**
> 기능 명세서에서 도출한 **초안**이다. 명세에 근거가 있는 항목과, 구현을 위해 이 문서에서 처음 정한 항목을 구분해 표기했다.
> `[제안]` 표시는 명세에 없어 이 문서가 제안하는 내용이며 Sprint 0에서 확정이 필요하다.
> `[S0-N]` 표시는 Sprint 0 결정 항목에 의존해 아직 확정할 수 없는 부분이다.

---

## 1. 공통 규약

### 1.1 기본 정보

| 항목 | 값 |
|---|---|
| Base URL | `/api/v1` |
| 내부 연동 Base URL | `/internal/v1` (AI 서버 전용, 외부 비공개) |
| 형식 | JSON (`application/json; charset=UTF-8`) |
| 시각 | ISO 8601, KST 오프셋 포함 (`2026-08-20T14:30:00+09:00`) |
| 금액 | 원 단위 정수 (`long`). 소수점·콤마 없이 숫자만 내려보낸다. 천 단위 콤마는 화면에서 처리 |
| 수량 | 정수 (`long`) |
| 등락률 | 소수 둘째 자리까지 (`number`, 예: `-1.24`) |

### 1.2 인증

- 카카오 OAuth 2.0으로 로그인하고, 서비스 인증은 JWT를 사용한다. (명세 2.1)
- 인증이 필요한 모든 요청은 헤더에 Access Token을 담는다.

```http
Authorization: Bearer {accessToken}
```

| 토큰 | 만료 | 저장 위치 |
|---|---|---|
| Access Token | 30분 `[제안]` | 메모리 또는 로컬 |
| Refresh Token | 2주 `[제안]` | HttpOnly 쿠키 권장 `[제안]` |

인증 불필요 엔드포인트: `POST /auth/kakao`, `POST /auth/refresh`

### 1.3 응답 형식

성공 시 **봉투 없이 리소스를 그대로** 내려준다. `[제안]`

```http
HTTP/1.1 200 OK
```
```json
{ "stockCode": "005930", "stockName": "삼성전자" }
```

실패 시 HTTP 상태 코드와 함께 아래 형태를 반환한다.

```json
{
  "code": "ORDER_INSUFFICIENT_CASH",
  "message": "예수금이 부족합니다",
  "detail": { "required": 735000, "available": 512000 }
}
```

| 필드 | 설명 |
|---|---|
| `code` | 기계가 분기할 식별자 (7장 전체 목록) |
| `message` | 사용자에게 그대로 노출 가능한 한국어 문구 |
| `detail` | 화면 표시에 필요한 부가 값. 없으면 생략 |

> 프론트엔드는 `message`를 그대로 노출해도 되도록 서버가 문구를 완성해서 내려준다. 화면마다 문구를 다시 만들지 않는다.

### 1.4 멱등성 (명세 11장)

**충전과 주문**은 멱등성 키가 필수다.

```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

| 상황 | 동작 |
|---|---|
| 헤더 누락 | `400 IDEMPOTENCY_KEY_REQUIRED` |
| 처음 보는 키 | 정상 처리하고 결과를 키와 함께 저장 |
| 이미 처리된 키, 동일 요청 | **재처리하지 않고 최초 결과를 그대로 반환** (동일 상태 코드) |
| 이미 처리된 키, 다른 요청 본문 | `409 IDEMPOTENCY_CONFLICT` |

키 보관 기간은 24시간으로 둔다. `[제안]`

### 1.5 페이징

목록 조회는 커서 기반을 쓴다. (명세 10.3의 trades 규칙을 전체에 통일) `[제안]`

**요청**: `?cursor={nextCursor}&size=20`
**응답**:

```json
{
  "items": [],
  "nextCursor": "eyJpZCI6MTAxfQ==",
  "hasNext": true
}
```

`nextCursor`가 `null`이면 마지막 페이지다.

### 1.6 투자 회차 규칙 (명세 2.3)

- 모든 쓰기 요청은 **활성 회차**를 대상으로 한다. 요청에 `roundId`를 받지 않는다.
- 조회 요청은 `roundId`를 선택적으로 받으며, 생략하면 활성 회차를 조회한다.
- 종료된 회차에 쓰기를 시도하면 `409 ROUND_READ_ONLY`.

---

## 2. 인증 API

### 2.1 카카오 로그인

```
POST /api/v1/auth/kakao
```

인증 불필요. 카카오 인가 코드를 받아 계정을 조회하거나 생성한다.
**최초 로그인이면 계정과 함께 가상 계좌, 1회차, 초기 예수금 1,000,000원을 생성한다.** (명세 2.1, 2.2)

**Request**
```json
{
  "authorizationCode": "abcd1234",
  "redirectUri": "https://{도메인}/oauth/kakao"
}
```

**Response `200 OK`**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "isNewUser": true,
  "user": {
    "userId": 1,
    "nickname": "홍길동",
    "profileImageUrl": "https://..."
  }
}
```

| 에러 | 상태 |
|---|---|
| `AUTH_KAKAO_FAILED` | 401 |

### 2.2 토큰 재발급

```
POST /api/v1/auth/refresh
```

**Request**
```json
{ "refreshToken": "eyJhbGciOi..." }
```

**Response `200 OK`**
```json
{ "accessToken": "eyJhbGciOi...", "refreshToken": "eyJhbGciOi..." }
```

Refresh Token도 함께 갱신한다(회전 방식). `[제안]`
재발급 실패 시 `401 AUTH_INVALID_TOKEN` → 클라이언트는 로그인 화면으로 이동한다.

### 2.3 로그아웃

```
POST /api/v1/auth/logout
```

**Response `204 No Content`**. 서버는 해당 Refresh Token을 무효화한다.

### 2.4 내 정보 조회

```
GET /api/v1/users/me
```

**Response `200 OK`**
```json
{
  "userId": 1,
  "nickname": "홍길동",
  "profileImageUrl": "https://...",
  "currentRoundId": 3,
  "joinedAt": "2026-08-25T10:00:00+09:00"
}
```

---

## 3. 계좌 · 투자 회차 API

### 3.1 계좌 요약 조회 (명세 9.1)

```
GET /api/v1/account
```

주식 잔고 화면 상단 요약. 모든 값은 원장에서 계산한 서버 값이다. (명세 9.3)

**Response `200 OK`**
```json
{
  "roundId": 3,
  "cashBalance": 1250000,
  "evaluationAmount": 735000,
  "totalAsset": 1985000,
  "asOf": "2026-08-20T14:30:00+09:00"
}
```

| 필드 | 설명 |
|---|---|
| `cashBalance` | 예수금 |
| `evaluationAmount` | 평가금액 = Σ(보유 수량 × 현재가) |
| `totalAsset` | 총자산 = 예수금 + 평가금액 |
| `asOf` | 시세 기준 시각. 화면에 "갱신 시각"으로 표시 |

> 포트폴리오 전체 수익률과 총자산 추이는 MVP 범위 밖이다. (명세 9.1)

### 3.2 계좌 리셋 (명세 2.3)

```
POST /api/v1/account/reset
```

현재 회차를 종료하고 새 회차를 생성한다. 원장은 삭제하지 않는다.
**새 회차에서는 누적 충전 한도도 초기화된다.** (명세 1.1)

**Response `200 OK`**
```json
{
  "closedRound": {
    "roundId": 3,
    "startedAt": "2026-08-25T10:00:00+09:00",
    "closedAt": "2026-09-10T15:00:00+09:00",
    "finalTotalAsset": 1985000
  },
  "newRound": {
    "roundId": 4,
    "startedAt": "2026-09-10T15:00:00+09:00",
    "cashBalance": 1000000
  }
}
```

원장에 `ROUND_CLOSE`, `ROUND_OPEN`, `INITIAL_GRANT`를 기록한다.

### 3.3 회차 목록 조회

```
GET /api/v1/rounds
```

매매 내역 화면의 회차 선택기에 사용한다.

**Response `200 OK`**
```json
{
  "items": [
    { "roundId": 4, "status": "ACTIVE", "startedAt": "...", "closedAt": null, "finalTotalAsset": null },
    { "roundId": 3, "status": "CLOSED", "startedAt": "...", "closedAt": "...", "finalTotalAsset": 1985000 }
  ]
}
```

`status`: `ACTIVE` | `CLOSED`

---

## 4. 모의 결제 (충전) API — 명세 3장

### 4.1 충전 한도 조회

```
GET /api/v1/deposits/limit
```

**Response `200 OK`**
```json
{
  "perRequestLimit": 10000000,
  "roundCumulativeLimit": 100000000,
  "roundDepositedAmount": 3000000,
  "remainingAmount": 97000000
}
```

### 4.2 충전

```
POST /api/v1/deposits
Idempotency-Key: {UUID}   ← 필수
```

**Request**
```json
{
  "amount": 1000000,
  "paymentMethod": "VIRTUAL_CARD"
}
```

`paymentMethod`: `VIRTUAL_CARD` | `VIRTUAL_TRANSFER` (시뮬레이션용 선택지)

**Response `201 Created`**
```json
{
  "depositId": 55,
  "amount": 1000000,
  "paymentMethod": "VIRTUAL_CARD",
  "cashBalanceAfter": 2250000,
  "depositedAt": "2026-08-20T14:31:02+09:00"
}
```

| 에러 | 상태 | 조건 |
|---|---|---|
| `DEPOSIT_AMOUNT_INVALID` | 400 | 0원 이하 |
| `DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED` | 409 | 1회 1,000만 원 초과 |
| `DEPOSIT_LIMIT_EXCEEDED` | 409 | 회차 누적 1억 원 초과. `detail.remainingAmount` 포함 |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | 헤더 누락 |

> **충전 취소 API는 제공하지 않는다.** (명세 1.1, 3.2)

---

## 5. 종목 API

### 5.1 종목 검색 · 자동완성 (명세 4장)

```
GET /api/v1/stocks/search?keyword={검색어}&size=10
```

- 2글자 이상부터 호출한다.
- 종목명 또는 종목코드로 검색한다. 초성 검색은 확장 범위.

**Response `200 OK`**
```json
{
  "items": [
    {
      "stockCode": "005930",
      "stockName": "삼성전자",
      "market": "KOSPI",
      "currentPrice": 73500,
      "changeAmount": -900,
      "changeRate": -1.21,
      "suspended": false
    }
  ]
}
```

`market`: `KOSPI` | `KOSDAQ`
`suspended`: 거래정지 여부. `true`면 화면에 뱃지를 노출하고 매수를 막는다.

### 5.2 종목 상세 (명세 7.1)

```
GET /api/v1/stocks/{stockCode}
```

**이 API 호출 시 서버가 최근 본 종목에 자동 기록한다.** (명세 5장) 별도 등록 API는 없다.

**Response `200 OK`**
```json
{
  "stockCode": "005930",
  "stockName": "삼성전자",
  "market": "KOSPI",
  "currentPrice": 73500,
  "previousClose": 74400,
  "changeAmount": -900,
  "changeRate": -1.21,
  "suspended": false,
  "suspendedReason": null,
  "watched": true,
  "asOf": "2026-08-20T14:30:00+09:00",
  "holding": {
    "quantity": 10,
    "avgBuyPrice": 71200,
    "evaluationProfit": 23000,
    "evaluationProfitRate": 3.23
  }
}
```

- `watched`: 관심 종목 등록 여부 (토글 초기 상태)
- `holding`: 보유하지 않으면 `null`

| 에러 | 상태 |
|---|---|
| `STOCK_NOT_FOUND` | 404 |

### 5.3 캔들 차트 (명세 7.2)

```
GET /api/v1/stocks/{stockCode}/candles?period=1M
```

`period`: `1M` | `3M` | `1Y` (모두 일봉 기준)
분봉은 확장 범위이며 도입 여부는 `[S0-4]`.

**Response `200 OK`**
```json
{
  "stockCode": "005930",
  "period": "1M",
  "interval": "DAY",
  "candles": [
    {
      "date": "2026-08-20",
      "open": 74000, "high": 74500, "low": 73100, "close": 73500,
      "volume": 12345678
    }
  ]
}
```

### 5.4 현재가 조회

```
GET /api/v1/stocks/{stockCode}/price
```

폴링 방식일 때 사용한다. 갱신 주기와 실시간 여부는 `[S0-2]`.

**Response `200 OK`**
```json
{
  "stockCode": "005930",
  "currentPrice": 73500,
  "changeAmount": -900,
  "changeRate": -1.21,
  "asOf": "2026-08-20T14:30:00+09:00",
  "stale": false
}
```

`stale`: 시세 원천에서 수신이 끊겨 마지막 수신 값을 쓰고 있는 경우 `true`. 허용 시간은 `[S0-3]`.

### 5.5 다건 현재가 조회

```
GET /api/v1/stocks/prices?codes=005930,000660,035720
```

관심 종목 목록, 보유 종목 목록에서 N+1 호출을 막기 위한 벌크 조회다. `[제안]`
한 번에 최대 50건. `[S0-1]`의 실시간 등록 건수 제한과 관심 종목 50개 정책이 충돌하면 갱신 방식을 조정한다.

**Response `200 OK`**
```json
{
  "items": [
    { "stockCode": "005930", "currentPrice": 73500, "changeAmount": -900, "changeRate": -1.21 }
  ],
  "asOf": "2026-08-20T14:30:00+09:00"
}
```

### 5.6 실시간 시세 구독 `[S0-2]`

웹소켓으로 결정될 경우의 초안이다. 폴링으로 결정되면 5.4/5.5만 사용한다.

```
WS /ws/v1/prices
```

구독: `{ "action": "SUBSCRIBE", "stockCodes": ["005930"] }`
수신: `{ "stockCode": "005930", "currentPrice": 73500, "changeRate": -1.21, "asOf": "..." }`

---

## 6. 최근 본 종목 · 최근 검색어 · 관심 종목

### 6.1 최근 본 종목 (명세 5장)

최대 30건 FIFO, 중복 시 최상단 갱신. 계정 기준 서버 저장.

```
GET    /api/v1/stocks/recent
DELETE /api/v1/stocks/recent/{stockCode}
DELETE /api/v1/stocks/recent
```

**GET Response `200 OK`**
```json
{
  "items": [
    { "stockCode": "005930", "stockName": "삼성전자", "currentPrice": 73500, "changeRate": -1.21, "viewedAt": "..." }
  ]
}
```

### 6.2 최근 검색어 (명세 4장)

최대 10건.

```
GET    /api/v1/stocks/search/recent
DELETE /api/v1/stocks/search/recent/{keywordId}
DELETE /api/v1/stocks/search/recent
```

### 6.3 관심 종목 (명세 6장)

**최대 50개.**

```
GET    /api/v1/watchlist?sort=REGISTERED
POST   /api/v1/watchlist
DELETE /api/v1/watchlist/{stockCode}
```

`sort`: `REGISTERED`(기본) | `NAME` | `CHANGE_RATE`

**GET Response `200 OK`**
```json
{
  "count": 12,
  "maxCount": 50,
  "items": [
    {
      "stockCode": "005930",
      "stockName": "삼성전자",
      "currentPrice": 73500,
      "changeAmount": -900,
      "changeRate": -1.21,
      "held": true,
      "registeredAt": "..."
    }
  ]
}
```

`held`: 보유 중이면 `true` → 화면에 "보유" 뱃지

**POST Request**: `{ "stockCode": "005930" }` → `201 Created`

| 에러 | 상태 | 메시지 |
|---|---|---|
| `WATCHLIST_LIMIT_EXCEEDED` | 409 | "관심 종목은 최대 50개까지 등록할 수 있어요" |
| `WATCHLIST_ALREADY_EXISTS` | 409 | |

---

## 7. 주문 API — 명세 7.3, 7.4

### 7.1 시장가 주문

```
POST /api/v1/orders
Idempotency-Key: {UUID}   ← 필수
```

MVP는 시장가 즉시 체결만 존재한다. 접수와 체결이 분리되지 않는다.

**Request**
```json
{
  "stockCode": "005930",
  "side": "BUY",
  "quantity": 10
}
```

`side`: `BUY` | `SELL`

**Response `201 Created`**
```json
{
  "orderId": 101,
  "stockCode": "005930",
  "stockName": "삼성전자",
  "side": "BUY",
  "quantity": 10,
  "executedPrice": 73500,
  "executedAmount": 735000,
  "executedAt": "2026-08-20T14:31:10+09:00",
  "cashBalanceAfter": 515000,
  "realizedProfit": null
}
```

`realizedProfit`: 매도일 때만 값이 있다.

### 7.2 체결 처리 순서 (명세 7.3)

서버는 아래 순서로 처리한다. **확인 화면의 예상 금액과 실제 체결가는 다를 수 있으므로 접수 시점에 재검증한다.**

```
1. 거래 시간 확인 (09:00~15:30 KST)      → 아니면 ORDER_MARKET_CLOSED
2. 종목 거래정지 확인                     → 정지면 ORDER_STOCK_SUSPENDED
3. 최신 수신 가격 조회                    → 없거나 허용 시간 초과면 ORDER_PRICE_UNAVAILABLE
4. 체결 직전 재검증 (최신 가격 기준 재계산)
     매수: 예수금 >= 수량 × 최신가        → 부족하면 ORDER_PRICE_CHANGED
     매도: 보유 수량 >= 주문 수량          → 부족하면 ORDER_INSUFFICIENT_QUANTITY
5. 원장 기록 + 잔고 반영 (단일 트랜잭션)
     매수: 예수금 차감, 보유 수량 증가, 평균 매수가 가중평균 재계산
     매도: 예수금 증가, 보유 수량 차감, 실현손익 계산, 전량 매도 시 잔고에서 제거
```

> 4번에서 부족하면 **수량을 임의로 줄여 체결하지 않고 주문을 거부한다.** (명세 7.3)
> 5번은 원장 기준 잔액 검증과 트랜잭션으로 동시 주문 시 예수금이 음수가 되지 않도록 한다. (명세 11장)

| 에러 | 상태 | 메시지 |
|---|---|---|
| `ORDER_MARKET_CLOSED` | 409 | "지금은 주문할 수 없어요 (거래 시간 09:00~15:30)" |
| `ORDER_STOCK_SUSPENDED` | 409 | 거래정지 사유 포함 |
| `ORDER_PRICE_UNAVAILABLE` | 503 | "시세를 불러올 수 없어 주문이 제한됩니다" |
| `ORDER_PRICE_CHANGED` | 409 | "가격이 변동되어 주문할 수 없어요. 다시 시도해 주세요" |
| `ORDER_INSUFFICIENT_CASH` | 409 | "예수금이 부족합니다" |
| `ORDER_INSUFFICIENT_QUANTITY` | 409 | "보유 수량이 부족합니다" |
| `ORDER_QUANTITY_INVALID` | 400 | 0 이하 |

### 7.3 주문 가능 정보 조회

주문 화면의 비율 버튼(10%/25%/50%/최대)과 거래 가능 여부 판단에 사용한다. `[제안]`

```
GET /api/v1/orders/available?stockCode=005930&side=BUY
```

**Response `200 OK`**
```json
{
  "tradable": true,
  "reason": null,
  "currentPrice": 73500,
  "availableCash": 1250000,
  "maxQuantity": 17,
  "holdingQuantity": 10
}
```

`tradable`이 `false`면 `reason`에 위 에러 코드 중 하나가 담긴다. 화면은 이 값으로 주문 버튼을 비활성화한다.

---

## 8. 잔고 · 매매 내역 API

### 8.1 보유 종목 목록 (명세 9.2)

```
GET /api/v1/portfolio?sort=EVALUATION
```

`sort`: `EVALUATION`(평가금액순, 기본) | `PROFIT_RATE`(수익률순)

**Response `200 OK`**
```json
{
  "roundId": 3,
  "cashBalance": 1250000,
  "evaluationAmount": 735000,
  "totalAsset": 1985000,
  "asOf": "2026-08-20T14:30:00+09:00",
  "holdings": [
    {
      "stockCode": "005930",
      "stockName": "삼성전자",
      "quantity": 10,
      "avgBuyPrice": 71200,
      "currentPrice": 73500,
      "evaluationAmount": 735000,
      "evaluationProfit": 23000,
      "evaluationProfitRate": 3.23
    }
  ]
}
```

계산식 (명세 0장 용어 정의):
- `evaluationAmount` = 보유 수량 × 현재가
- `evaluationProfit` = (현재가 − 평균 매수가) × 보유 수량
- `evaluationProfitRate` = 평가손익 ÷ (평균 매수가 × 보유 수량) × 100

### 8.2 매매 내역 (명세 8장)

원장 기반 통합 내역이다. 충전과 회차 전환도 함께 조회된다.

```
GET /api/v1/transactions?roundId=3&type=ALL&cursor=&size=20
```

| 파라미터 | 값 |
|---|---|
| `roundId` | 생략 시 활성 회차 |
| `type` | `ALL`(기본) \| `BUY` \| `SELL` \| `DEPOSIT` |

**Response `200 OK`**
```json
{
  "roundId": 3,
  "items": [
    {
      "transactionId": 301,
      "type": "SELL",
      "occurredAt": "2026-08-20T14:31:10+09:00",
      "stockCode": "005930",
      "stockName": "삼성전자",
      "price": 73500,
      "quantity": 5,
      "amount": 367500,
      "realizedProfit": 11500,
      "realizedProfitRate": 3.23,
      "paymentMethod": null
    },
    {
      "transactionId": 300,
      "type": "DEPOSIT",
      "occurredAt": "2026-08-20T14:31:02+09:00",
      "stockCode": null,
      "stockName": null,
      "price": null,
      "quantity": null,
      "amount": 1000000,
      "realizedProfit": null,
      "realizedProfitRate": null,
      "paymentMethod": "VIRTUAL_CARD"
    }
  ],
  "nextCursor": "eyJpZCI6Mjk5fQ==",
  "hasNext": true
}
```

`type` 전체 값 (명세 8장 원장 유형): `INITIAL_GRANT` | `DEPOSIT` | `BUY` | `SELL` | `ROUND_OPEN` | `ROUND_CLOSE`
정렬은 최신순 고정. 기간·종목 필터는 확장 범위.

---

## 9. AI 서버 내부 연동 API — 명세 10.3

- **읽기 전용이다.** AI 서버는 원장을 쓰지 않는다. (명세 10.1)
- 외부에 노출하지 않고 서비스 간 내부 토큰으로 인증한다.
- 필드 최종 확정은 `[S0-5]`.

```http
X-Internal-Token: {서비스 간 공유 토큰}
X-User-Id: 1
```

### 9.1 포트폴리오 조회

```
GET /internal/v1/portfolio
```

```json
{
  "roundId": 3,
  "cashBalance": 1250000,
  "asOf": "2026-08-20T14:30:00+09:00",
  "holdings": [
    {
      "stockCode": "005930",
      "stockName": "삼성전자",
      "quantity": 10,
      "avgBuyPrice": 71200,
      "currentPrice": 73500
    }
  ]
}
```

### 9.2 거래 이력 조회

```
GET /internal/v1/trades?roundId=3&cursor=&size=100
```

```json
{
  "roundId": 3,
  "trades": [
    {
      "tradeId": 101,
      "stockCode": "005930",
      "side": "BUY",
      "price": 71200,
      "quantity": 10,
      "executedAt": "2026-08-18T10:12:44+09:00"
    }
  ],
  "nextCursor": null,
  "hasNext": false
}
```

기본 100건, 커서 기반 페이징. (명세 10.3)

> **미확정**: 평가손익 같은 파생 지표를 백엔드가 함께 내려줄지 AI가 계산할지는 `[S0-5]`에서 정한다. 현재 초안은 **원본 값만 내려주고 AI가 계산**하는 쪽이다.

---

## 10. 에러 코드 목록

### 인증
| 코드 | 상태 |
|---|---|
| `AUTH_KAKAO_FAILED` | 401 |
| `AUTH_INVALID_TOKEN` | 401 |
| `AUTH_EXPIRED_TOKEN` | 401 |
| `AUTH_FORBIDDEN` | 403 |

### 공통
| 코드 | 상태 |
|---|---|
| `INVALID_REQUEST` | 400 |
| `RESOURCE_NOT_FOUND` | 404 |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 |
| `IDEMPOTENCY_CONFLICT` | 409 |
| `ROUND_READ_ONLY` | 409 |
| `INTERNAL_ERROR` | 500 |

### 충전
| 코드 | 상태 |
|---|---|
| `DEPOSIT_AMOUNT_INVALID` | 400 |
| `DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED` | 409 |
| `DEPOSIT_LIMIT_EXCEEDED` | 409 |

### 종목 · 관심 종목
| 코드 | 상태 |
|---|---|
| `STOCK_NOT_FOUND` | 404 |
| `WATCHLIST_LIMIT_EXCEEDED` | 409 |
| `WATCHLIST_ALREADY_EXISTS` | 409 |

### 주문
| 코드 | 상태 |
|---|---|
| `ORDER_QUANTITY_INVALID` | 400 |
| `ORDER_MARKET_CLOSED` | 409 |
| `ORDER_STOCK_SUSPENDED` | 409 |
| `ORDER_PRICE_CHANGED` | 409 |
| `ORDER_INSUFFICIENT_CASH` | 409 |
| `ORDER_INSUFFICIENT_QUANTITY` | 409 |
| `ORDER_PRICE_UNAVAILABLE` | 503 |

---

## 11. 엔드포인트 요약

| 분류 | Method | Path | 멱등성 키 |
|---|---|---|:---:|
| 인증 | POST | `/api/v1/auth/kakao` | |
| 인증 | POST | `/api/v1/auth/refresh` | |
| 인증 | POST | `/api/v1/auth/logout` | |
| 인증 | GET | `/api/v1/users/me` | |
| 계좌 | GET | `/api/v1/account` | |
| 계좌 | POST | `/api/v1/account/reset` | |
| 계좌 | GET | `/api/v1/rounds` | |
| 충전 | GET | `/api/v1/deposits/limit` | |
| 충전 | POST | `/api/v1/deposits` | **필수** |
| 종목 | GET | `/api/v1/stocks/search` | |
| 종목 | GET | `/api/v1/stocks/{stockCode}` | |
| 종목 | GET | `/api/v1/stocks/{stockCode}/candles` | |
| 종목 | GET | `/api/v1/stocks/{stockCode}/price` | |
| 종목 | GET | `/api/v1/stocks/prices` | |
| 최근 본 | GET/DELETE | `/api/v1/stocks/recent` | |
| 최근 검색 | GET/DELETE | `/api/v1/stocks/search/recent` | |
| 관심 종목 | GET/POST/DELETE | `/api/v1/watchlist` | |
| 주문 | POST | `/api/v1/orders` | **필수** |
| 주문 | GET | `/api/v1/orders/available` | |
| 잔고 | GET | `/api/v1/portfolio` | |
| 내역 | GET | `/api/v1/transactions` | |
| AI 내부 | GET | `/internal/v1/portfolio` | |
| AI 내부 | GET | `/internal/v1/trades` | |

---

## 12. 확정이 필요한 항목

| # | 항목 | 의존 | 영향 |
|---|---|---|---|
| 1 | 응답 봉투 유무, Access/Refresh 만료 시간 | 팀 합의 | 전체 API, FE 인터셉터 |
| 2 | 실시간 방식 (웹소켓 vs 폴링) → 5.4/5.5/5.6 중 무엇을 쓸지 | `[S0-2]` | 시세 관련 전부 |
| 3 | `stale` 허용 시간과 주문 차단 기준 | `[S0-3]` | 7.2의 3번 단계 |
| 4 | 다건 시세 조회 최대 건수 (관심 종목 50개와 KIS 등록 제한 충돌) | `[S0-1]` | 5.5, 관심 종목 화면 |
| 5 | 분봉 도입 시 `candles`의 `period`/`interval` 확장 | `[S0-4]` | 5.3 |
| 6 | AI 응답에 파생 지표를 백엔드가 포함할지 | `[S0-5]` | 9.1, 9.2 |
| 7 | 커서 인코딩 방식 | 팀 합의 | 페이징 전체 |

---

## 13. 다음 작업

1. 위 12장 항목을 Sprint 0에서 확정한다.
2. 확정 후 **OpenAPI 3.0 문서(`openapi.yaml`)로 옮긴다.** 프론트엔드 Mock(MSW)은 이 문서가 아니라 OpenAPI 문서를 기준으로 생성한다.
3. 예시 응답 JSON을 엔드포인트별로 고정해 Mock과 통합 테스트가 같은 값을 쓰게 한다.
