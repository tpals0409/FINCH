---
sprint: 6
title: "서빙과 시세"
date: "2026-09-05"
status: completed
parts: [infra, backend]
related_adrs: ["sprint-5"]
topics: [배포, k3s, ArgoCD, SealedSecret, Cloudflare, TLS, KIS, 종목API, 시세캐시, 서버에이전트]
tldr: "KIS 를 로컬에서 뚫는 걸 포기하고 서버에 올려 푸는 쪽으로 스코프를 바꿨다. 서버 상주 에이전트 Pico 를 통해 실측한 결과 KIS 가 3~5ms 로 뚫렸고, 더 중요하게는 k3s·ArgoCD·Prometheus Operator·Sealed Secrets 가 이미 설치돼 있어 gitops README 가 '서버 정해져야 한다'고 적어둔 7항목의 절반이 사라졌다. 배포 준비 5커밋(TLS 전략 전환·metrics 재활성화·postgres 봉인·호스트 확정·AI 제외)과 종목 API 3개를 넣었지만 Cloudflare Origin Certificate 와 카카오 키가 안 놓여 실제 배포는 못 했다 — 이번 스프린트의 목표였고, 그래서 KIS IP 화이트리스트 요구 여부라는 유일한 미지수도 그대로 남았다. 빌드 결과를 grep 에 파이프해 47개 실패를 EXIT 0 으로 두 번 오보한 것이 가장 큰 인시던트다."
---
# Sprint 6 — 서빙과 시세

_날짜: 2026-09-05_

## 목표

KIS 를 한 번 뚫어 응답을 고정하고 그 위에 `stock`·`price` 도메인과 화면을 올리는 것이 원래 계획이었다.
스프린트 시작 직후 **"KIS 는 서버에 올리면 해결된다"** 로 방향이 바뀌면서 **서빙이 스코프 안으로 들어왔다.**

## 결정 사항

### D1. 로컬에서 KIS 를 뚫지 않는다. 서버에서 푼다

Sprint 5 가 싸피 유선망에 막혀 시세를 못 붙였다. 픽스처를 손으로 짜는 길과 네트워크를 바꾸는 길이
있었는데, 셋째 길을 골랐다 — 서버는 애초에 다른 망에 있다. 실측으로 확인됐다:
로컬 `connect timeout 10.0s`, 서버 `3~5ms`.

### D2. k3s 를 새로 깔지 않는다. 남의 클러스터에 얹는다

서버에 이전 프로젝트(PinLog)의 k3s v1.36.2 가 이미 있었고 ArgoCD·Prometheus Operator·
Grafana·Loki·Traefik·Sealed Secrets 가 전부 딸려 있었다. finch-gitops README 의 "아직 안 된 것"
7항목 중 **① 부트스트랩과 ⑤ 관측 스택이 그 자리에서 사라졌다.** 특히 ⑤ 는 Sprint 3 에서
`ServiceMonitor` CRD 부재로 backend 배포를 Degraded 로 세우던 그 항목이다.

### D3. TLS 는 네임스페이스 Secret 으로. 전역 TLSStore 를 세우지 않는다

차트는 원래 Traefik 전역 기본 인증서(`TLSStore/default`)에 기댔다. "Secret 을 네임스페이스마다
복사하면 새 네임스페이스가 생길 때 조용히 깨진다"가 근거였는데 그 전제가 둘 다 무너졌다 —
클러스터의 `TLSStore/default` 는 **삭제됐고**, 쓰려는 Cloudflare Origin Certificate 는
**15년짜리라 복사본이 만료로 어긋날 일이 없다.**

전역을 다시 세우지 않은 이유는 따로 있다. 그건 클러스터 전체의 기본값이라, 나중에 다른 서비스가
들어오면 그쪽 도메인에 우리 인증서가 붙어 경고를 낸다. 네임스페이스 안에 가두면 비용이 같고 파급이 없다.

### D4. 앱을 도메인 루트에 두지 않는다

`finchapp.org` 를 샀지만 앱은 `app.finchapp.org` 에 올린다. 루트와 `www` 는 히어로 페이지 자리다.
나중에 옮기려면 DNS·인증서·카카오 리다이렉트 URI 를 한꺼번에 고쳐야 해서 지금 정했다.
frontend `/` 와 backend `/api` 가 **같은 호스트**라 CORS 설정이 통째로 없다.

Origin Certificate 는 `finchapp.org` + `*.finchapp.org` 와일드카드로 받는다 — `www` 든 `admin` 이든
붙일 때 재발급이 없다.

### D5. Cloudflare Tunnel 을 쓰지 않는다

PinLog 는 `cloudflared` 터널로 붙어 있었고 그게 지금 죽어서 `pin-log.com` 이 530 을 뿜는다.
우리는 인바운드 80/443 이 열려 있어(내 노트북에서 직접 6ms 실측) A 레코드로 직행한다.
파드 하나와 터널 토큰 관리가 통째로 빠진다.

### D6. 첫 배포에서 AI 를 뺀다

`ai-secrets` 를 미리 만들지 않는 쪽을 골랐다. 백엔드에 AI 중계가 없어(`domain/ai` 에 예외 클래스
하나뿐) 지금 만든 내부 토큰은 아무도 쓰지 않고, 중계가 붙을 때 계약이 정해지면 다시 봉인해야 한다.
쓰이지 않는 비밀값을 먼저 만들면 그게 맞는지 아무도 확인하지 않는다.

첫 배포의 목적은 KIS 가 서버에서 뚫리는지 확인하는 것이다. 부품이 적을수록 왜 실패했는지 안다.

### D7. 시세는 읽기 절반만 먼저 만든다

검색·상세 응답이 둘 다 현재가를 품는데 KIS 수집 계층이 없다. 그런데 apiSpec 5.4 가 "값 없음
(캐시 미스) → 전부 `null`, `stale: true`" 를 이미 정의해뒀다. **빈 캐시를 읽은 결과가 그 줄과
정확히 같아서**, 진짜 Redis 읽기 경로를 만들어두면 계약을 어기지 않고 가짜 구현도 아니다.
수집이 붙으면 읽는 쪽은 한 줄도 안 고친다.

등락은 캐시에 담지 않고 `stock.previous_close` 로 유도한다. 스키마가 그 컬럼을
"의도적 중복"(erd.md §2.7)이라 적어둔 근거가 이 계산이다.

## 구현

**FINCH** (PR #25, 브랜치 `docs/sprint-6-server-agent`)

- **`35877c4`** — `docs/ops/pico.md`. 서버 상주 에이전트 브리핑
- **`2eb03dd`** — 종목 검색·상세·일봉 API 와 시세 캐시 읽기 절반

**finch-gitops** (PR #1, 브랜치 `feat/sprint-6-deploy`)

- **`3ae5419`** — Ingress 를 네임스페이스 TLS Secret 참조로. `metrics` 재활성화
- **`a18836b`** — postgres 2대 SealedSecret
- **`9f3a0a7`** — 호스트 `app.finchapp.org`
- **`b7db06b`** — 백엔드 DB 이름 `finch_db` 로 정정
- **`88aebc0`** — 첫 배포에서 AI 서비스 끔

**규모(물리적 사실)**: FINCH 18파일 +816/−2 · finch-gitops 7파일 +80/−13

**검증(물리적 사실)**:
- backend `GRADLE_EXIT=0` · **143 tests · 실패 0 · 오류 0** (`PriceResTest` 5개 신규)
- `helm template` — ai **0 리소스** / backend **5 리소스** (AI 스위치 확인)
- `tlsSecretName` 있으면 `secretName` 렌더 / 비우면 기존 동작 유지 / `ServiceMonitor` 1개
- 봉인 공개키 SHA-256 지문 대조 일치 (`8B:DF:00:C0:…`)
- `app.finchapp.org` → Cloudflare 프록시 확인, HTTPS **404 · `ssl_verify_result=0`** —
  원본까지 도달(안 닿으면 52x)
- **배포 미실행.** root 앱을 apply 하지 않았다

## 인시던트

1. **빌드 결과를 grep 에 파이프해 47개 실패를 "EXIT 0" 으로 두 번 오보했다**:
   `./gradlew test | grep -E "BUILD|FAILED"` 의 종료 코드는 grep 의 것이다. gradle 이 실패해도
   grep 이 뭔가 찾으면 0 이 된다. 잘못된 초록불 위에 계속 쌓았다. 실패 모드 — **검증을 안 한 것보다
   나쁘다. 안 했으면 다시 볼 텐데 통과했다고 믿으면 그 위에 쌓는다.**

2. **설정을 `application.yaml` 의 prod 프로파일 문서 안에 넣어 컨텍스트 테스트 37개가 죽었다**:
   87번 줄의 `---` 아래가 `on-profile: prod` 인데 파일 끝에 `finch.price.stale-after` 를 붙였다.
   테스트에서 `PlaceholderResolutionException` 으로 스프링이 안 떴다. 실패 모드 —
   **YAML 파일 끝에 붙이는 습관이 프로파일 구획을 못 본다.**

3. **로컬 `finch-gitops` `main` 이 6커밋 낡아 잘못된 베이스에 커밋했다**:
   `git switch -c … main` 이 낡은 로컬 `main` 을 짚었다. 원격은 멀쩡했다. 리베이스로 정리.
   실패 모드 — **`main` 이라는 이름이 최신을 보장하지 않는다.**

4. **이미 있는 `isWatched` 를 중복으로 만들었다**: Sprint 5 가 `WatchlistItemRepository` 에
   `existsByUserIdAndStockCode` 와 서비스 메서드를 미리 깔아뒀는데 못 보고 다시 썼다.
   실패 모드 — **CLAUDE.md 가 "가장 흔한 낭비"라고 적어둔 그것.**

5. **검색 검증이 프론트 MSW 목과 갈렸다**: 목은 2글자 미만·`size` 범위 밖을 400 으로 짜뒀는데
   서버는 빈 목록이었다. `apiSpec 5.1` 이 서버 동작을 안 적어둬서 각자 정한 결과다. 목에 맞추고
   문서에도 적었다. 실패 모드 — **문서가 안 정한 자리는 구현마다 다르게 정해진다.**

## 이월

**A. 서빙** — 전부 사용자 입력 대기
- [ ] `finch-origin-tls` 봉인 (Cloudflare Origin Certificate 두 파일)
- [ ] `backend-secrets` 봉인 (카카오 키 2종 + `JWT_SECRET` + DB)
- [ ] GHCR 패키지 public 전환 또는 `ghcr-pull` 봉인
- [ ] GitHub 시크릿 `KAKAO_CLIENT_ID` 등록 (없으면 로그인 버튼만 조용히 죽는다)
- [ ] 카카오 콘솔에 `https://app.finchapp.org/oauth/kakao` 등록
- [ ] PR #25 · finch-gitops#1 머지 → Pico 가 root 앱 apply

**B. KIS 실물** — 배포 후에만 가능
- [ ] 토큰 발급 → **IP 화이트리스트 요구 여부 판명** (egress `223.130.147.160`)
- [ ] 응답 캡처 → 픽스처 고정
- [ ] `[S0-1]` 실시간 등록 한도 · `[S0-3]` stale 허용 시간 실측
      (지금 `stale-after: 15s` 는 **잠정값**이고 시안의 "시세 지연" 임계도 같은 값을 쓴다)

**C. 도메인·화면**
- [ ] `price` 의 쓰기 절반 — KIS 클라이언트 · Redis 적재
- [ ] `GET /watchlist` (시세가 붙으면 열린다)
- [ ] 프론트 종목 검색·상세 (`RoutePlaceholder` 9개 중 2개)

**기타**
- [ ] `prefers-reduced-motion` (스켈레톤 23곳) · 토큰 소유권 문장 정리
- [ ] Flyway 가 V1·V2·V3·V5 다. **V4 를 만들면 그 순간 백엔드 기동이 실패한다** — 다음은 V6
- [ ] Grafana·Alertmanager 가 누락 Secret 으로 비정상. FINCH 지표는 Prometheus 쿼리로 본다

## 교훈

- **파이프라인의 종료 코드는 마지막 명령의 것이다.** 빌드·테스트를 grep 에 넘기면 실패가
  0 으로 둔갑한다. 파일로 받고 `$?` 를 따로 찍고, 개수는 통과 수와 **실패 수를 둘 다** 적는다.
  하나만 적으면 같은 실수를 반복한다.

- **"이미 있다"를 먼저 확인하는 비용이 다시 만드는 비용보다 항상 싸다.** 이번 스프린트에서
  `isWatched` 를 중복 작성했고, 반대로 `finch-prod` 네임스페이스와 AppProject 는 이미 있어서
  쓸 게 없었다. 두 경우 다 먼저 봤으면 알았다.

- **남의 환경을 조사하면 계획이 줄어드는 쪽으로도 바뀐다.** 서버에 k3s 를 깔 준비를 하고 있었는데
  이미 있었고 관측 스택까지 딸려 왔다. 조사를 미루고 준비부터 했으면 그 준비가 통째로 버려졌다.

- **헤어핀은 도달성의 증거가 아니다.** 서버가 자기 공인 IP 를 찌른 결과는 외부 유입을 증명하지
  못한다. **어디서 쟀는지가 무엇을 쟀는지를 바꾼다.**

- **문서가 정하지 않은 자리는 구현마다 다르게 정해진다.** apiSpec 이 검색어 2글자 미만의 서버
  동작을 안 적어둬서 목과 서버가 갈렸다. 계약 문서의 빈칸은 나중에 두 배로 갚는다.
