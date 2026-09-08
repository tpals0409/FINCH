---
sprint: 11
title: "캔들 완성과 모바일 셸"
date: "2026-09-08"
status: completed
parts: [backend, frontend, ai, mobile, infra]
related_adrs: ["sprint-10", "sprint-9"]
buzz_thread: "80605a7061bbc3b509bcab1cad3fef90e34335b535ff170fe45e624d738ba7ff"
topics: [캔들, 어휘검색, 계측, 승인차단, 메시징규약, 부분완료, 이월]
tldr: "Sprint 11은 Sprint 10에서 이월된 캔들 경로를 양쪽 다 master에 넣고 배포까지 마쳤다. 백엔드 적재 #84와 프론트 차트 #80이 머지·배포됐고 Pico가 파드 정합성을 확인했다. 그러나 운영 실응답 검증은 못 했다 — 캔들 backfill의 유일한 진입점이 08:00 cron이고 그 대상인 핫셋이 아직 1종목이기 때문이다. 30종 투입은 관심 토글을 누를 브라우저 표면이 없어 막혔다. 계획에 없던 가장 큰 성과는 AI 316.6ms의 정체를 끝까지 특정한 것이다. 어휘 경로의 db_execute가 전체의 93%이고, 그 안에서 6,007행에 대한 ts_rank_cd 투영이 77%였다. ts_rank 교체로 운영 EXPLAIN이 311.9 → 133.3ms가 되는 것까지 확인했다. 자동 승인 검토가 파트 에이전트를 세 번 막아 한 시간을 버렸고, 그 대응으로 메시징 규약 세 절을 스킬에 명시했다."
---
# Sprint 11 — 캔들 완성과 모바일 셸

_기간: 2026-09-08 18:53 ~ 21:10 KST_

## 목표

캔들 데이터·화면을 운영 실응답까지 연결한다. 30종 핫셋 실측으로 거래 가능 범위를 넓힌다.
WebView 기반 모바일 앱 셸의 설치 가능한 첫 빌드를 만든다.

## 결정 사항

### D1. 캔들 backfill의 진입점은 08:00 cron 하나뿐이고, 그래서 핫셋을 그 앞에 채운다

Pico가 "실행 가능한 수동 backfill 진입점이 없다"고 보고했고 코드가 그것을 확인해줬다.
`git grep 'DailyCandleSyncJob' -- backend/src/main/**`이 참조 0건이다. 진입점은
`@Scheduled(cron = "0 0 8 * * *", zone = "Asia/Seoul")` 하나뿐이고 HTTP·액추에이터 노출이 없다.

대상은 `HotStockCodeReader.first(30)`, 즉 **08:00 시점의 핫셋**이다. 원래 절차는 30종을 09:00
정규장에 채우는 것이었는데, 그러면 그 30종의 일봉은 **다음날 08:00**에나 들어온다. 캔들 검증이
통째로 하루 밀린다.

그래서 채우는 시점을 09:00 → **08:00 이전**으로 당겼다. `KisPriceCollector.kt:139-140`의
`MARKET_OPEN 09:00` 게이트가 있어 미리 채워도 수집기는 09:00까지 돌지 않는다 — KIS 호출이
늘지 않는다. 한 번의 아침에 backfill과 처리량 실측이 둘 다 끝난다.

### D2. 어휘 검색의 병목은 스캔이 아니라 6,007행에 대한 `ts_rank_cd` 투영이다

Sprint 9가 남긴 "316.6ms를 쪼개라"를 원 환경에서 끝냈다. 14:05에 미리 갈라둔 세 갈래 중
두 번째(`db_execute`만 늘면 어휘 실행 계획)가 나왔고, 그 안에서 한 번 더 갈렸다.

`ts_rank_cd`가 SELECT 목록과 ORDER BY에 둘 다 있어 **정렬 전에 6,007행 전부에 계산된다.**
219행짜리 해시에 6,007행을 던지는 Hash Join 자체는 마이크로초다.

**GIN 인덱스만으로는 22%밖에 못 준다**는 것이 이 분해의 실질적 결론이었다. `lexical_tsquery`가
바이그램을 전부 OR로 묶어 10,198청크 중 6,007행이 매치되므로, 찾는 속도가 빨라져도 랭킹할 행
수는 그대로다. 8질의 매치 행이 805~7,060으로 한 질의만의 현상도 아니다.

지연이 아니라 **확장성 절벽**이다. 매치율이 고정이면 비용이 코퍼스에 선형이라 청크가 10배면
이 구간은 2.4초가 된다.

### D3. Recall@5는 이 변경의 품질 게이트가 될 수 없다

Finch-AI가 `ts_rank` 교체 근거로 "Recall@5 7/7 = 1.000 유지"를 제시했다. 그러나
**`ts_rank_cd`에서도 이미 7/7이었다.** 천장에 붙은 지표는 나빠졌는지를 못 본다. 두 팔이 같은
값인 것은 "안 나빠졌다"가 아니라 "이 자로는 잴 수 없다"다.

절반은 덮는다 — 정답이 top-5 **밖으로** 떨어지는 최악은 배제된다. 안 본 것은 top-5 **안에서의
재배열**이다. 그래서 머지 게이트를 8질의의 top-5 chunk id 집합·순서 비교로 바꿨다.

### D4. CronJob의 Completed 파드는 지우지 않는다. 선택자를 고친다

운영 평가 스크립트가 `안정된 단일 AI Pod가 필요하다: 현재 2개`로 멈췄다. 센 두 번째는
Completed Job 파드였다.

`charts/microservice/templates/cronjob.yaml:46`이 Job 파드에도 `microservice.selectorLabels`를
붙이고, `price-snapshots`가 매일 07:30 KST에 돈다. Completed 파드가 남는 것은
`successfulJobsHistoryLimit` 대로의 정상 동작이다. **파드를 지우면 오늘은 통과하고 내일 아침
같은 자리에서 다시 막힌다.** 고칠 곳은 클러스터가 아니라 선택자였다.

### D5. 게시가 막히면 승인을 왕복하기 전에 기계가 만든 증거를 본다

자동 승인 검토가 파트 에이전트의 PR 생성·본문 게시·수치 보고를 세 번 막았다. 매번
"승인해달라 → 승인한다 → 또 막혔다"를 반복해 한 시간이 비었다.

**#80은 결국 승인 없이 끝났다.** CI가 정확히 그 커밋에서 `check.sh`를 이미 돌렸기 때문이다.
CI 로그·워크플로 run의 `head_sha`·PR 상태는 Fin이 게시 승인 없이 직접 읽고, 자기보고보다 강한
증거다. 이것과 착수 한 줄, buzz 발행 실패 모드를 `finch-team` 스킬에 명시했다(#91).

### D6. 미실측 수치로 리소스를 올리지 않는다

같은 질의·같은 코퍼스가 로컬 55.4ms, 운영 311.9ms로 5.6배다. 두 실행 다 `shared hit`만 있고
read가 0이라 디스크가 아니라 순수 CPU다. `postgres-ai`의 `requests.cpu`가 100m인 것이 유력한
가설이지만, 재보기 전에는 올리지 않고 이슈 #90으로 남겼다.

## 구현

- **766f0e2** — `feat(stock): sync daily candles from AI` (#84)
  `DailyCandleSyncJob`·`CandleHistoryClient`·`DailyCandleWriter`, 08:00 KST cron, 멱등 적재
- **7bf12f1** — `feat(eval): 운영 검색 지연 원자료 기록 추가` (#86)
  구간별 median·p95와 환경 식별자를 원자료로 남기는 평가 하니스
- **f0dd5d4** — `fix(eval): 서빙 AI 파드만 측정 대상으로 고른다` (#88)
  `component!=cronjob` + `status.phase=Running`. 개수 확인과 파드 선택이 같은 필터를 쓰게 해
  `items[0]` 오선택도 제거. 회귀 테스트 2건
- **636e933** — `feat(frontend): 종목 상세 캔들 차트 (1M/3M/1Y)` (#89)
  1M/3M/1Y 전환, non-empty·empty·error MSW, 구조화 경계 로그
- **591b168** — `docs(team): 착수 한 줄 · 게시 차단 시 증거 우선 · buzz 발행 실패 모드` (#91)

**규모(물리적 사실)**: master `48ead9b..591b168` 5커밋, 31파일, +1522/−19
(frontend 12 · backend 12 · ai 5 · docs 1 · .claude 1)

**검증(물리적 사실)**

```text
#84  766f0e2   CI success · Images success · GitOps f237408 · backend sha-766f0e2103dc
               Pico: Deployment revision 13 · Pod backend-965f8498b-fqf8r Ready · restart 0
#86  7bf12f1   CI ai success (head d003273, head_sha 일치 확인) · GitOps 1ec32d3
               ai sha-7bf12f16939b · Pod revision 8 Ready
#88  f0dd5d4   CI/Images success · GitOps faef6eb · ai sha-f0dd5d437095 · revision 9 Ready
               ai/scripts/check.sh 819 tests
#89  636e933   CI run 34220674363 head 7b03da7 success · check.sh 6단계 전부
               Test Files 12/12 · Tests 36/36 · GitOps f4dc203 · frontend sha-636e9338670b
#91  591b168   CI run head a550812 success · 문서 전용
운영 실응답     미실행 — daily_candle 0행, 운영 핫셋 005930 1종
```

**AI 검색 계측(물리적 사실)**

```text
live 40표본   total 306.4 / 401.1 ms      lexical DB 285.6 / 376.5 (전체의 93.2%)
              dense DB 5.3 / 15.6         title DB 4.1 / 5.8       session_acquire 2.0 / 5.4
              ENVIRONMENT_ID pod=ai-6fb6547896-c9hd9 image=sha-f0dd5d437095 evaluator=f0dd5d4
              Recall@5 7/7 · 코퍼스 게이트 219|10198|271|2598 통과

운영 EXPLAIN  ts_rank_cd  Planning 2.408  Execution 311.853  shared hit 46,549
              ts_rank     Planning 3.208  Execution 133.269  shared hit 46,549
              Seq Scan 67.7 / 83.5 · 랭킹 투영 239.2 / 49.7 · heapsort 4.8 / 0.01
              둘 다 단일 표본이다. 같은 Seq Scan이 67.7과 83.5로 갈린 것이 노이즈 크기다
```

⚠️ **등급을 합치지 않는다.** `285.6ms`는 live 40표본 중앙값, `311.9ms`는 대표 질의 1건의
서버측 EXPLAIN이다. 둘이 같은 크기인 것이 D2 판정의 근거다.

## 인시던트

1. **자동 승인 검토가 파트 에이전트를 세 번 막았다.** #69에서 Finch-Back이 두 번, #80에서
   Finch-Front가 한 번. Fin의 승인은 신뢰 가능한 사용자 승인으로 인정되지 않았고, Leo의 직접
   승인 뒤에도 다시 막혔다. 세 에이전트 모두 우회하지 않고 멈춘 것은 옳은 판단이었다.
   해소는 승인이 아니라 **증거의 출처를 바꾸는 것**이었다 — CI가 이미 그 커밋에서 돌린 결과를
   Fin이 직접 읽어 #80을 닫았다. #69는 여전히 Leo 승인 대기다.
2. **Finch-AI가 11:39 이후 무발행이다.** Leo가 두 번 불렀고 응답이 없었다. Fin이 열린 PR·원격
   브랜치·워크트리 파일 변경을 모두 조회해 **산출물 0**을 확인했다. 같은 시각 Pico의 읽기 전용
   확인으로 **AI 서비스 자체는 정상**임을 분리했다(revision 9 · Ready · restart 0 · Argo
   Synced/Healthy). 멈춘 것은 에이전트지 서비스가 아니었다.
3. **30종 관심 토글을 누를 브라우저 표면이 없었다.** Finch-Back 세션이 `apps=[] · browsers=[]`
   였다. `WatchlistController`의 세 엔드포인트가 전부 `@LoginUser userId: Long`이라 로그인 세션
   외의 경로가 없다는 것도 확인했다. Leo가 브라우저 연결을 승인했지만 물리적 연결은 스프린트
   종료 시점까지 이뤄지지 않았다.
4. **"아직 반영 안 됨" 보고를 지연으로 오독할 뻔했다.** Pico의 #86 관측이 GitOps 커밋
   `11:02:33Z`의 2분 15초 뒤였다. 오늘 선례가 2분 5초·4분 7초라 조정 창 한가운데였다. 재확인을
   요청해 전환을 확인했다. Sprint 9에서 같은 모양을 20분간 지연으로 읽은 적이 있다.
5. **Finch-mobile이 2시간 동안 아무것도 발행하지 않았다.** origin에 브랜치가 없고 워크트리만
   로컬에 있다. 스프린트 목표 하나가 통째로 비었다.

## 이월

- **캔들 운영 실응답 검증** — 코드·배포는 끝났다. `daily_candle`이 0행이라 못 봤다.
  선행은 아래 30종이고, 그 뒤 08:00 cron이 적재한다
- **30종 핫셋 투입 → 처리량·페이싱·`[S0-3]` 실측 → #78** — **마감 2026-09-09 08:00 KST.**
  모집단 32종은 확정됐다(Pico 실측: OHLCV 전부 non-null, 1Y 창 230~233행, backend
  `previous_close` non-null과 동일 집합). 현재 핫셋이 `005930` 1종이라 **더할 것은 29종**이고
  총계가 정확히 30이어야 한다 — 31 이상이면 `findAfter("", 30)`이 코드 오름차순 앞 30만 잡아
  뒤쪽이 조용히 빠지고 페이싱 상한도 깨진다
- **PR #69 전일 종가 배치** — head `19e74b4` · `check.sh` 199 tests 통과. Leo 승인 대기
- **어휘 `ts_rank` 교체** — Fin 승인함. 머지 전에 top-5 집합·순서 비교(D3)가 붙어야 한다.
  그 뒤 GIN 인덱스가 1순위다(교체 후 남는 133.3ms 중 83.5ms가 Seq Scan)
- **#87 `price_daily`가 2주째 갱신되지 않는다** — `ingest.prices`가 스케줄에 없다.
  캔들 차트 오른쪽 끝 2주가 빈 채로 통과한다
- **#90 운영 postgres-ai가 로컬보다 5.6배 느리다** — CPU 보장분 가설. 재기 전에 안 올린다
- **005930 `NETWORK_ERROR` 원인 규명** — 착수하지 못했다
- **Finch-mobile Capacitor 셸·Android 첫 빌드** — 산출물 없음

## 교훈

- **값이 언제 만들어지는지 보면 순서가 따라 나온다.** 캔들 backfill의 진입점이 08:00 cron이고
  대상이 그 시점의 핫셋이라는 사실 하나가, 30종 투입 시점을 09:00에서 08:00 이전으로 옮기고
  하루를 벌었다. 코드 세 줄을 읽으면 나오는 답이었다.
- **큰 수를 쪼개면 고칠 곳이 바뀐다.** 어휘 285.6ms를 그대로 봤다면 GIN 인덱스를 넣고 닫았을
  것이고 22%만 줄었을 것이다. 쪼개니 77%가 랭킹 투영이었다. 그리고 그것을 걷어내자 남은
  것에서 인덱스 비중이 63%로 뒤집혔다 — **한 번 쪼갠 것으로 끝이 아니다.**
- **천장에 붙은 지표는 게이트가 아니다.** Recall@5가 두 팔에서 같은 1.000인 것은 품질이
  유지됐다는 증거가 아니라 그 자로는 잴 수 없다는 뜻이다. 지표를 받을 때 **변화를 감지할 수
  있는 범위에 있는지**를 먼저 본다.
- **반복되는 실패는 그 자리가 아니라 한 단계 위에서 고친다.** Completed 파드를 지우는 것은
  오늘만의 해법이고 내일 07:30에 다시 막힌다. 승인 왕복도 마찬가지였다 — 승인을 한 번 더
  받는 대신 증거의 출처를 CI로 바꾸자 즉시 끝났다.
- **에이전트의 침묵은 정보가 아니었다.** 빈 확인 메시지를 금지한 결과, 일하는 에이전트와 멈춘
  에이전트가 방에서 구분되지 않았다. 규칙 자체는 옳지만 착수 한 줄이 빠져 있었다. 규약의
  구멍은 그것을 만든 사람이 고친다.
- **에이전트 장애와 서비스 장애를 먼저 분리한다.** "AI가 정상 작동 안 하는데?"는 두 가지로
  읽힌다. 산출물 조회와 클러스터 읽기를 각각 돌려 갈라 답해야 엉뚱한 곳을 고치지 않는다.
