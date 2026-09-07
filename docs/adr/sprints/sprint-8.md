---
sprint: 8
title: "핫셋과 페이싱"
date: "2026-09-07"
status: completed
parts: [backend, infra]
related_adrs: ["sprint-7"]
buzz_thread: "2e1c8e2bcb5b465d24ecd1527d9c7f5845b8b265ad1a505d3448debfe079e837"
topics: [KIS, 시세수집, 핫셋, 호출페이싱, ArgoCD, CI, 이월정리]
tldr: "Sprint 7 이 넘긴 이월 8건을 빠른 순으로 훑다가, #46(KIS 시세 수집)이 통째로 열려 3시간짜리 스프린트가 됐다. 수집 대상을 전 종목 2,598개에서 핫셋(보유·관심·최근 본)으로 줄이고 호출 사이에 간격을 넣어 실가동 직전까지 배포했다. 스프린트의 중심 사건은 구현이 아니라 사양 오류였다 — Fin 이 KIS SDK 코드에서 실전·모의 두 값을 다 읽고도 우리 키가 모의라는 것을 확인하지 않아 30배 틀린 한도(초당 20건)를 사양으로 내려보냈고, 팀은 그대로 구현했으며, 그 값이 코드 상수와 기동 게이트까지 올라갔다. 되돌린 방식이 결론이다 — 숫자를 고친 게 아니라 미실측 수치를 코드에서 values 로 내렸다. 수집기 실가동은 정규장이 없어 못 쟀고 다음 스프린트로 넘긴다."
---
# Sprint 8 — 핫셋과 페이싱

_날짜: 2026-09-07_

## 목표

Sprint 7 이 넘긴 이월 8건 중 **지금 손댈 수 있는 것**부터 처리한다는 것이 시작이었다.
실제로는 그중 하나(#46 KIS 시세 수집)가 통째로 열려 스프린트 전체를 가져갔다.
나머지는 잘라내거나 다음으로 넘겼다.

## 결정 사항

### D1. 수집 대상은 전 종목이 아니라 핫셋이다

`is_active` 종목이 2,598개인데 `stale-after` 가 15초다. 신선하게 유지하려면 초당 173건이
필요하고 어떤 한도로도 안 맞는다. **모든 종목이 항상 `stale: true` 로 나가는 설계였다.**

세 갈래를 놓고 A 를 골랐다.

```
A  핫셋만 수집        holding(quantity>0) ∪ watchlist_item ∪ recent_viewed_stock
B  stale-after 150s   매매 화면이 2분 지난 값을 "지연 아님" 으로 표시하게 된다
C  다건 조회 API      있으면 산수가 통째로 바뀐다. 확인 안 됨
```

사용자가 보지 않는 2,300종목의 현재가를 15초 신선도로 유지할 이유가 없다.
커서 순회 구조는 그대로 두고 대상 질의만 바꿨다.

`holding` 은 `quantity > 0` 으로 거른다 — 전량 매도해도 행을 지우지 않고 `quantity = 0`
으로 남기기 때문이다(V2 마이그레이션 주석).

### D2. 미실측 한도는 코드 상수가 아니라 주입값으로 둔다

`backConvention.md` §8 이 이미 금지하고 있던 것을 어겼다가 되돌렸다.

> 한도 수치는 `[S0-1]` 실측 대기이고 41은 가정값이다 — 상수로 분리하고
> **수치에 의존하는 로직을 만들지 않는다**

첫 구현은 `MIN_INTERVAL = 50ms` 를 코드 상수로 박고, 그 위에 `maxBatchSize =
cycleInterval / MIN_INTERVAL` 을 세우고, 다시 그 위에 기동 시 `require` 게이트를 세웠다.
미실측 가정 하나가 세 겹으로 굳었다.

되돌린 방식이 중요하다. **숫자를 고친 게 아니라 층을 내렸다.**

```kotlin
@Value("\${KIS_MIN_REQUEST_INTERVAL}")   // 기본값을 두지 않는다
```

`require(batchSize <= cycleInterval / minRequestInterval)` 은 주입값 위에서 그대로 산다.
모의 ↔ 실전 전환이 코드 변경이 아니라 values 변경이 됐다.

함정이 하나 딸려 있었다. `KisRequestPacer` 가 조건 없는 `@Component` 라, 기본값 없는
`@Value` 를 붙이면 **KIS 를 끈 환경에서도 기동이 실패한다.** 수집기와 같은
`@ConditionalOnProperty(finch.price.kis.enabled=true)` 를 같이 걸어 막았다.

### D3. 스위치와 값은 한 커밋에 같이 간다

`KIS_PRICE_ENABLED` 만 먼저 켜고 값을 나중에 넣으면, 기본값 없는 `@Value` 셋이 비어
**예외 로그가 아니라 파드 CrashLoop** 이 된다. GitOps PR #12 는 값 넷을 넣되 스위치는
`false` 로 두는 한 커밋이다. 내일 바꾸는 것은 마지막 한 줄뿐이다.

같은 이유로, `enabled=false` 인 지금 파드가 기동한다는 사실은 **값 넷의 정합성을 증명하지
않는다.** 수집기 빈이 아예 조립되지 않기 때문이다. 그 증명은 켜는 순간 처음 일어난다.

### D4. `docs/adr/sprints/**` 는 고치지 않는다

Sprint 8 초반에 프론트 검증을 돌려 통과시켰지만(`typecheck 0 · test 20 passed · lint 0`),
`sprint-7.md` 검증 절의 **"frontend 미실행"** 은 그대로 뒀다. 종료 시점에 실제로 안 돌린
것이 사실이고 ADR 은 그때의 기록이다. 이 측정은 Sprint 8 의 기록으로 남는다.

## 구현

- **979866d** — `fix(docs): 없는 ADR-0002 참조를 지운다` (#54)
- **09a0de4** — `feat(backend): KIS 핫셋 수집과 호출 페이싱 추가` (#55)
- **gitops 29c290b** — `feat: KIS 시세 수집 설정을 주입한다 (스위치는 아직 false)` (#12)
- **gitops 3407be8** — `chore: 이미지 태그 갱신 sha-09a0de4918e3`
- 원격 브랜치 정리 — FINCH 24 → 6, gitops 3 → 1 (커밋 없음)

**규모(물리적 사실)**: FINCH 11파일 +421/−31 · finch-gitops 1파일 +18/−1

**검증(물리적 사실)**

```
브랜치 1d1a378   ./gradlew clean build  BUILD SUCCESSFUL
                 TESTS=177 FAILURES=0 ERRORS=0
master 09a0de4   CI success (backend) · Images success → gitops 3407be8
helm template    image sha-09a0de4918e3 · KIS_BASE_URL openapivts:29443
                 KIS_MIN_REQUEST_INTERVAL 500ms · KIS_PRICE_BATCH_SIZE 6
                 KIS_PRICE_ENABLED false
클러스터          backend-prod reconciled_at 11:01:31Z · image sha-09a0de4918e3
(Pico 읽기전용)   pod Ready · Running · restart 0 · KIS_PRICE_ENABLED false
KIS 모의 호스트    inquire-price http=200 · rt_cd=0 · msg_cd=MCA00000
                 005930 stck_prpr=270000 · 대문자 쿼리 파라미터로 통함
frontend         npm ci 0 · typecheck 0 · test 5 files 20 passed · lint 0
수집기 실가동      미실행 — 정규장(09:00~15:30 KST) 대기
```

## 인시던트

1. **미실측 한도를 사양으로 확정했다.** KIS 공식 SDK 의 `_smartSleep` 두 값(실전 0.05 ·
   모의 0.5)을 다 읽고도 우리 키가 어느 쪽인지 확인하지 않고 "실전 20건/초" 를 사양으로
   내려보냈다. `docs/spec/secrets.md:18` 과 `docs/ops/deploy-runbook.md:135` 가 둘 다
   **모의**라고 적어두고 있었다. 30배 틀린 값이었고 팀은 사양대로 정확히 구현했다.
   500ms·6건으로 정정하고 D2 로 층을 내렸다.

2. **master 에 90초 간격으로 두 번 머지해 이미지가 만들어지지 않았다.**
   `ci.yml` 의 `concurrency: cancel-in-progress: true` 가 앞 실행을 취소했고,
   `images.yml` 의 `wait-for-ci` 가 그 취소를 실패로 읽어 build·bump 를 건너뛰었다.
   **머지는 됐는데 그 코드가 든 이미지가 없는 상태**가 됐다. CI 재실행으로 복구했다.

3. **초록불이 다른 커밋의 것이었다.** `gh run list --branch master --limit 1` 이
   success 였는데 그건 뒤에 머지한 docs PR 의 실행이었다 — paths-filter 가 backend 를
   건너뛰어 초록이었다. 문제의 커밋 실행은 실패해 있었다. 2번을 하마터면 못 볼 뻔했다.

4. **HTTP 400 의 원인이 진단 명령이었다.** 토큰을 뽑는 `grep` 이
   `access_token_token_expired` 필드까지 잡아 값에 개행이 섞였고, 그게 `authorization`
   헤더를 깨뜨렸다. **코드는 무관했다** — `KisPriceClient` 는 Jackson 으로 파싱해서 이
   실수가 불가능하다. 반나절 동안 코드를 의심했다.

5. **ArgoCD `root` 를 보고 `backend-prod` 를 판단했다.** 백엔드를 배포하는 것은
   ApplicationSet 이 만든 `backend-prod` 인데 `root` 의 revision 을 근거로 두 번 연속
   틀린 결론을 냈다(드리프트다 → 아니다). `backend-prod` 기준으로 보니 폴링 지연이 맞았고
   `10:57:32Z → 11:01:31Z` 로 정상 반영됐다. Pico 가 수동 sync 를 끝까지 하지 않은 덕에
   이것이 정상 동작이라는 사실이 관측됐다.

6. **`/sprint-open` 이 3단계에서 멈춰 윈도우가 활성화되지 않았다.** 제목 질문에서 대화가
   다른 주제로 넘어갔고 4단계(`status: active` · `start_commit` 기록)에 도달하지 못했다.
   스프린트 내내 `sprint-window.md` 는 `idle` · `start_commit 미정` 이었다.
   `/sprint-close` 1단계 가드가 이것을 "활성 스프린트 없음" 으로 읽는다.

## 이월

- **#46 수집기 실가동 검증** — `KIS_PRICE_ENABLED` 를 `true` 로. 정규장 09:00 KST.
  켠 직후 순서: 파드 Ready → 수집기 WARN 유무 → Redis 적재 → `stale: false → true` 전이.
  **1번이 D2·D3 의 안전장치가 처음 시험받는 지점**이고, 어긋나면 CrashLoop 이라 로그만
  보면 놓친다
- **KIS 한도 실측** — 500ms·6건은 보수적 선택값이지 잰 값이 아니다. `KIS_PRICE_BATCH_SIZE`
  를 올리려면 간격도 같이 내려야 한다(지금 배치 6 = 주기 ÷ 간격, **여유 0**)
- **처리량 · 페이싱 · `[S0-3]` stale 임계** — 운영 핫셋이 1종목(초당 0.33건)이라 못 잰다.
  핫셋을 채우거나 사용자가 쓰기 시작해야 재진다
- **알림함 화면** — 유일하게 남은 `RoutePlaceholder`. `featureSpec` §12 어느 표에도 없다
- **Finch-Wiki 초안 저장** — 사서 역할 활성화 대기
- **AI 316.6ms 구간 계측** — `ai_responses` 비캐시 표본 0건
- **SSAFY 디자인 브랜치 4개** — 캐릭터 에셋을 건지기 전에는 지우지 않는다
- **`monitoring` stale 마커** — 클러스터 변경이라 우리 몫이 아니고, 앱이 없어져 무해하다

## 교훈

- **한도 수치를 사양에 적기 전에 그것이 어느 환경 것인지 본다.** SDK 에서 두 값을 다 읽는
  것으로는 부족하다. 우리 키가 어느 쪽인지가 답이고, 그건 이미 레포 문서 두 곳에 적혀
  있었다. 오케스트레이터의 사양 오류는 팀 전체가 정확히 구현해주기 때문에 더 비싸다.
- **미실측 값은 코드가 아니라 설정에 둔다.** 상수로 박으면 그 위에 로직이 얹히고 기동
  게이트가 얹혀서, 나중에 재고 나서 고칠 자리가 세 곳이 된다. 되돌리기의 핵심은 숫자가
  아니라 **어느 층에 두느냐**였다.
- **초록불을 볼 때 어느 커밋의 어느 실행인지 본다.** 그리고 `master` 에 연달아 머지하지
  않는다 — 앞 PR 의 Images 가 끝나고 gitops 태그가 오른 것을 보고 다음을 머지한다.
- **관측이 안 맞으면 관측 대상부터 의심한다.** HTTP 400 은 진단 명령의 버그였고, ArgoCD
  드리프트는 잘못된 Application 을 본 것이었다. 두 번 다 코드와 클러스터는 멀쩡했다.
- **스위치가 꺼진 채로 기동한다는 사실은 아무것도 증명하지 않는다.** 조건부 빈은 조립되지
  않는다. 증명은 켜는 순간 시작되므로, 켠 직후의 Ready 확인이 검증의 일부다.
