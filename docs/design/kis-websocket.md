# KIS 실시간 시세 수집 설계안

상태: T5 운영 실측 완료. 이 문서는 구현 PR의 근거가 되는 백엔드↔KIS 수집 설계와 확인 범위를 담는다.

## 목표와 경계

현재 `KisPriceCollector`는 핫셋을 커서로 순회하며 KIS 현재가 REST API를 호출한다. 운영 실측에서
모의 키의 호출 간격이 500ms이고, 핫셋 30종과 `stale-after=15s`가 여유 없이 맞물려
`EGW00201`(초당 거래건수 초과)과 stale 캐시가 발생했다. KIS 웹소켓은 이 병목을 줄이기 위한
수집 경로다.

이번 설계의 경계는 **KIS 웹소켓에서 백엔드 Redis 캐시까지**다.

- 프론트 REST 응답과 `PriceService`의 응답 형식은 바꾸지 않는다.
- 백엔드 STOMP(`/ws`)와 프론트 폴링은 이번 설계에서 구현하지 않는다. 프론트가 읽는 값은
  지금처럼 `price:{stockCode}`에서 나온다.
- KIS 웹소켓 주소와 모의 키의 `approval_key` 발급 가능 여부는 T5로 확인했으며, 구독 상한은
  정확한 최대치가 아니라 `31종 이상`이라는 실측 하한만 확인했다.
- 기존 REST 수집은 웹소켓 장애·미지원 종목·구독 상한 초과 시의 폴백으로 남긴다.

## 설계의 운영 근거

Pico가 읽기 전용으로 확인한 기준선은 활성 핫셋 30종, Redis 캐시 30/30, `asOf` 나이
최소·중앙값·최대 1.330초·26.593초·71.081초, `stale-after=15s` 초과 22/30종이었다.
같은 관측 기간의 KIS 실패 598건은 모두 `kisMsgCd=EGW00201`이고 `kisMsg`는
`초당 거래건수를 초과하였습니다.`였다. 따라서 웹소켓 도입의 목적은 화면 전달 방식을 바꾸는
것이 아니라 KIS REST 초당 한도에 붙은 백엔드 수집 병목을 줄이는 것이다. 이 수치는 T5 이후
재측정할 기준선이며, 웹소켓이 실제로 더 신선한 값을 제공한다는 증거로 해석하지 않는다.

T5에서 서버 호스트가 `ws://ops.koreainvestment.com:31000`에 연결해 `H0STCNT0` / `005930`
틱을 받았고, 31종 구독 요청은 31/31 성공 ack·오류 0·틱 234건이었다. 구독 요청을 0.05초
간격으로 보내도 20건/초까지 오류가 관측되지 않았다. 이는 상한이나 무제한 처리량의 증명이
아니라 각각 `>=31`, `20/s까지 미관측`인 하한이다.

backend Pod에서는 `ops.koreainvestment.com:31000`의 DNS 해석과 TCP 연결이 확인됐다
(2026-09-10, Pico, `210.107.75.39:31000` Established). 이 관측은 TCP egress 범위만
증명하며, 해당 Pod에서의 WebSocket upgrade·인증·프레임 수신은 런타임 통합 검증 대상이다.

## 현재 구현의 사실

현재 경로는 다음과 같다.

```text
holding(quantity > 0) ∪ watchlist_item ∪ recent_viewed_stock
        ↓ PriceCollectionTargetRepository
정렬된 종목 코드 커서
        ↓ KisPriceCollector + PriceCollectorLease + KisRequestPacer
KisPriceClient REST inquire-price
        ↓
PriceCacheWriter → Redis price:{stockCode}
        ↓
PriceService → currentPrice, asOf, stale
```

`PriceCacheWriter`는 `PriceTick(currentPrice, asOf)`를 기존 키에 덮어쓰고 TTL을 두지 않는다.
수집이 멈춰도 마지막 값과 수신 시각을 보존하고, `PriceService`가 읽는 시각과 `stale-after`를
비교해 지연을 표시한다. 웹소켓도 이 writer를 그대로 사용해야 두 경로의 캐시 스키마가 갈라지지 않는다.

`PriceCollectorLease`는 Redis의 `price:collector:lease`로 백엔드 복제본 중 한 수집자만 외부
KIS 호출을 하게 한다. 웹소켓도 이 리더십 경계 안에서 연결을 하나만 소유한다. 연결을 복제본마다
열면 KIS 앱키 하나의 구독·호출 한도를 중복 소비한다.

## 제안 컴포넌트

`price` 도메인 안에 수집 조정 계층을 둔다.

```text
PriceCollectionCoordinator
├── KISWebSocketClient              연결, 프레임 송수신, 종료 감지
├── KISApprovalKeyProvider          access token과 별도의 approval_key 발급·갱신
├── KISSubscriptionRegistry         현재 구독 집합과 desired 집합의 차이 계산
├── KISPriceMessageDecoder          KIS 프레임 → PriceTick 변환
├── PriceCacheWriter                기존 Redis writer 재사용
├── PriceCollectionTargetRepository 기존 핫셋 조회 재사용
├── KisPriceCollector               미지원·장애 종목 REST 폴백
└── PriceCollectorLease             단일 리더십 재사용
```

웹소켓 클라이언트는 KIS 프로토콜을 격리한다. approval key, 앱 키, 앱 시크릿, 원문 인증 프레임은
도메인 서비스나 로그로 흘리지 않는다. 조정 계층이 외부 프로토콜을 `PriceTick`으로 바꾼 뒤에는
수신 경로를 구분하지 않고 writer에 전달한다.

## 연결과 인증 흐름

T5에서 확인한 모의 웹소켓 주소는 `KIS_WEBSOCKET_URL` 설정으로 주입한다. 모의 approval key는
`POST https://openapivts.koreainvestment.com:29443/oauth2/Approval`에서 발급한다. 현재가 REST의
access token을 웹소켓 인증값으로 재사용하지 않는다. 공식 샘플도 모의 서버를 `ws://...:31000`,
실전 서버를 `ws://...:21000`으로 안내하며, `wss://` 대안은 저장소 공식 샘플과 이번 실측에서
확인되지 않았다. 따라서 현재는 평문 endpoint를 사용하되 approval key를 영속 저장하지 않고
프로세스 메모리에만 두며, 연결이 끝나면 즉시 폐기한다.

```text
1. PriceCollectorLease 획득
2. REST 토큰과 별도의 approval_key 발급
3. T5에서 확인된 모의 웹소켓 endpoint 연결
4. KIS가 요구하는 approval_key·앱 식별자 프레임 전송
5. 연결 확인 후 현재 핫셋을 구독
6. 수신 `0|H0STCNT0|<count>|<^-delimited-fields>` 체결 프레임을 decode하여
   `PriceCacheWriter.write()`
```

approval key 발급 실패, 웹소켓 연결 실패, 인증 거부는 현재 캐시를 지우지 않고 REST 폴백으로
넘긴다. 실패 로그에는 종목 코드, 연결 상태, 재연결 시도 횟수와 비밀값 제외 오류 코드만 남긴다.

## 핫셋 변경과 구독 상한

현재 핫셋은 별도 등록 테이블이 아니라 세 테이블의 UNION 쿼리로 계산된다. 따라서 첫 연결 뒤에도
스케줄된 조정 작업이 `count`가 아니라 전체 코드 목록을 주기적으로 읽어 desired 집합을 만든다.
별도 등록 신호를 추가하지 않아도 최근 본 종목 유입과 보유·관심 변경을 발견할 수 있다.

```text
desired = active holding ∪ watchlist ∪ recent viewed
current = KIS에 등록된 집합
subscribe = desired - current
unsubscribe = current - desired
```

구독 상한은 현재 `>=31`이라는 하한만 확인했으므로 단일 설정으로 주입하고 실제 최대치로
간주하지 않는다. 상한을 넘는 종목의 우선순위는 다음과
같이 서버 전체 LRU로 결정한다.

1. 현재 연결된 STOMP/폴링 관심 신호가 있는 종목
2. 보유 수량이 양수인 종목
3. 관심 종목
4. 최근 본 종목
5. 같은 등급에서는 마지막 관심 시각이 최신인 종목

다만 이 우선순위와 “보유를 항상 보장할지”는 실제 상한이 핫셋보다 작을 때 제품 결정으로 확정한다.
상한 안에 들어오는 동안에는 핫셋 전체를 구독한다. 상한 밖 종목은 REST 폴백 대상으로 남긴다.

구독 추가·해제는 연결이 살아 있을 때만 수행한다. 변경 중 연결이 끊기면 현재 집합을 성공으로
기록하지 않고 재연결 후 desired 전체를 다시 등록한다. 이 방식은 중간 UNSUBSCRIBE/재구독 실패로
서버와 KIS의 집합이 어긋나는 상태를 줄인다.

## 프레임 처리와 캐시 쓰기

KIS 웹소켓의 실제 프레임 필드는 T5에서 받은 페이로드로 고정한다. 설계상 내부 결과는 다음 조건을
만족해야 한다.

- 종목 코드는 6자리 문자열로 검증한다. `005930`을 숫자로 변환하지 않는다.
- 현재가가 양의 정수가 아니거나 수신 시각을 만들 수 없으면 해당 프레임만 폐기한다.
- 유효한 프레임은 `PriceTick(currentPrice, asOf)`로 변환해 기존 `PriceCacheWriter`에 전달한다.
- 캐시 쓰기는 종목별 원자적인 Redis 값 교체로 처리한다. 부분 필드를 여러 키에 나누지 않는다.
- 같은 종목의 늦은 프레임이 최신 프레임을 덮지 않도록, 메시지의 거래 시각을 신뢰할 수 있는
  계약으로 확인한 뒤 단조성 비교를 둔다. KIS 프레임에 신뢰할 시각이 없으면 연결 수신 시각만
  사용하고 이 제한을 관측 문서에 남긴다. 현재 H0STCNT0의 체결시각 필드는 운영 계약으로
  확정하지 않았으므로 수신 시각을 사용하며, 같은 연결에서 수신 순서가 내부 `asOf` 순서를
  보장한다.
- 파싱 실패와 알 수 없는 이벤트는 연결 전체를 끊지 않고 제한된 WARN으로 남긴다. 원문 payload,
  토큰, 앱 키는 로그에 넣지 않는다.

REST와 웹소켓이 같은 종목을 동시에 갱신하지 않도록 조정 계층이 소유권을 나눈다. 웹소켓 구독
성공 종목은 REST 폴백 목록에서 제외하고, 연결 장애·구독 거부·상한 초과 종목만 REST collector가
처리한다. 웹소켓이 복구되면 해당 종목을 REST 폴백에서 제거한다.

## 연결 끊김, 재연결, 폴백

```text
CONNECTED
  ├─ heartbeat/data 수신 → 캐시 갱신
  ├─ subscribe 실패     → 해당 종목을 REST 폴백으로 이동
  └─ close/error         → RECONNECTING

RECONNECTING
  ├─ 지수 backoff + jitter로 재시도
  ├─ 성공 → 새 TCP 연결마다 approval_key를 재발급
  │        → desired 전체 재구독 → REST 폴백 집합 축소
  └─ 실패 → REST 폴백 유지, 다음 재시도 예약
```

backoff는 연결이 살아난 뒤 초기화한다. 장외·주말에는 연결을 새로 만들지 않고 기존 캐시를
유지한다. 장 시작 시 approval key 유효성을 확인하고 연결을 준비한다. 재연결 폭주를 막기 위해
복제본마다 독립적으로 재시도하지 않고 `PriceCollectorLease`를 다시 획득한 리더만 시도한다.

REST 폴백은 기존 `KisPriceCollector`의 `KisRequestPacer`, `Retry-After`, 재시도 가능 오류 처리,
커서 순회를 재사용한다. 웹소켓 연결 실패 때 REST를 별도 무제한 재시도로 실행하지 않는다. 한
주기에서 실패한 종목은 다음 스케줄로 넘기고, `EGW00201` 같은 한도 오류는 원문 `kisMsg`를 보존해
진단한다.

## 운영 관측과 안전장치

구현 전에 다음 지표를 추가 설계 검토한다. 값과 라벨에는 비밀값과 사용자 정보가 없어야 한다.

- 웹소켓 연결 상태, 마지막 연결 시각, 마지막 수신 시각
- 구독 성공·거부·해제 수와 현재 구독 수 / T5에서 측정한 상한
- 종목별 마지막 수신 시각과 `stale-after` 초과 수
- REST 폴백 종목 수와 `EGW00201`, 네트워크 오류, 파싱 오류 집계
- 재연결 횟수와 backoff 단계

알람은 연결이 끊겼다는 사실만으로 즉시 캐시를 지우지 않는다. 캐시 값은 유지하고 `PriceService`가
`stale=true`로 표시한다. 운영에서 웹소켓이 정상 수신하는지 확인하기 전에는 REST 주기·호출 간격·
`stale-after`를 변경하지 않는다.

## T5에서 확정한 것과 남은 검증

- approval key 발급: 모의 Approval endpoint HTTP 200
- endpoint: `ws://ops.koreainvestment.com:31000`
- 거래 TR: `H0STCNT0`, 005930 틱 수신
- 동시 구독: 31/31 성공 ack·오류 0·틱 234건, 정확한 최대치가 아닌 `>=31` 하한
- 구독 속도: 20건/초까지 throttle 미관측, 그 이상은 미측정
- 재연결: 새 TCP 연결마다 approval key를 발급하고, 연결 중에는 키를 재사용하지 않는다.
  공식 샘플도 웹소켓 접속키를 별도 발급하며, 키의 유효기간을 이 코드에서 추정하지 않는다.

남은 검증은 실제 backend Pod에서의 WebSocket upgrade·approval 인증·프레임 수신과 운영에서의
정확한 구독 상한이다. 상한이 30보다 작다는 증거가 나오면 보유·관심·최근 본 우선순위를 제품
결정으로 되돌린다. `wss://` endpoint가 제공되는지는 공식 샘플과 T5에서 확인하지 못했으므로,
평문 연결을 임의로 TLS로 바꾸지 않는다.

## 근거

- `backend/src/main/kotlin/com/finch/domain/price/service/KisPriceCollector.kt`
- `backend/src/main/kotlin/com/finch/domain/price/service/PriceCacheWriter.kt`
- `backend/src/main/kotlin/com/finch/domain/price/service/PriceCollectorLease.kt`
- `backend/src/main/kotlin/com/finch/domain/price/repository/PriceCollectionTargetRepository.kt`
- `docs/api/apiSpec.md` §5.4~§5.6
- `docs/convention/backConvention.md` §2.4, §5, §8
- 한국투자증권 공식 샘플: `koreainvestment/open-trading-api`의
  `legacy/websocket/python/ws_domestic+overseas_stock.py` 및 `examples_user/kis_auth.py`
