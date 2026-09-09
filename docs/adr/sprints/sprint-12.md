---
sprint: 12
title: "스프린트 12 재개"
date: "2026-09-09"
status: closed
parts: [backend, frontend, ai, mobile, docs]
related_adrs: ["sprint-11"]
buzz_thread: "086a43dc705e65c26046ddedad2cd84911982716d56c856bbc18b113c52a546e"
topics: [KIS 장애 로깅, 검색 랭킹, 모바일 셸, 시세 폴링, 일봉 갱신]
tldr: "Sprint 12는 12커밋·143파일 규모로 종료했다. KIS 실패 원인 로깅, UX writing, 시세 폴링 주입, 모바일 셸, price_daily 갱신 플래그와 CronJob을 완료했으며, 첫 실행 운영 검증과 토큰 갱신 여유·핫셋·postgres-ai·로그 redaction은 Sprint 13으로 이월했다."
---
# Sprint 12 — 스프린트 재개

## 목표

이월된 운영 검증과 모바일 셸 작업을 재개하고, 장애 관측·검색 랭킹·시세 갱신·시세 폴링의 판정 근거를 남긴다.

## 범위와 판정

| 이슈 | 결과 | 근거 |
|---|---|---|
| #102 — KIS 실패 로깅 | ✅ 완료 | PR #112, `6405447`. 실제 로그에서 `KIS 시세 수집 실패 stockCode=005930 retryable=false`, `kisMsgCd=EGW00201`, `kisMsg=종목코드 오류`를 확인했다. |
| #96 — UX writing | ✅ 완료 | PR #105, `f51bced4`. |
| #58 — 시세 폴링 | ✅ 완료 | PR #111, `b8b22a59`. |
| #101 — 모바일 셸 | ✅ 완료 | PR #107, `985906e`. APK 내부 `assets/public/index.html` 624B와 `offline.html` 802B를 확인했다. |
| #87 — `price_daily` 갱신 | ✅ 코드·호출 경로 완료 | PR #114, `8520257`에 `--existing-only` 플래그를 넣고, GitOps PR #17, `03b2450`에서 06:30 KST CronJob을 추가했다. 첫 실행은 2026-09-10 06:30 KST이며 2026-09-09 클러스터에는 변경이 없었다. |
| #103 — 토큰 갱신 여유 | ❌ 이월 | PR 없음. Sprint 13에서 처리한다. |

각 구현 항목은 관련 PR의 머지와 CI 결과를 확인했다. 스케줄 변경은 머지로 완료 판정하지 않고 첫 운영 로그로 판정하며, #87의 첫 실행 검증은 Sprint 13에서 수행한다.

## 구현 규모와 검증

커밋 범위는 `b7d087b..985906e`의 12커밋, 143파일, `+5,454/-296`이다.

```text
mobile 63 · frontend 59 · backend 13 · docs 4 · ai 2 · .github 1 · .claude 1
```

검증 근거는 각 PR 및 운영 관측에 연결한다. #101은 APK 산출물의 `assets/public/` 내용을 직접 확인했고, #87은 호출 플래그와 GitOps CronJob이 모두 머지된 상태까지 확인했다. #87의 실제 스케줄 성공 여부는 첫 실행 이후 갱신한다.

## 종료 시점에 추가로 확인된 항목

- #79 — 캔들 데이터 경로: 08:00 KST `targets=30 succeeded=30 failed=0 changed=6921`, `daily_candle` 0행에서 6,921행으로 증가했다.
- #68 — `previous_close`: 08:30 KST `received=2594 updated=2594`를 확인했다.
- #113 — iOS 플랫폼: PR이 master에 `be0d2a6`으로 머지되었고, head `af96ebc4c9c1`에서 CI와 Images가 성공했다. Xcode 경로 설정과 시뮬레이터 빌드는 Sprint 13에 남긴다.

## 이월

- **#78 — 최근 본 종목 기록·핫셋의 빠진 절반**: 30종 핫셋 투입과 처리량·페이싱·`[S0-3]` 실측을 Sprint 13에서 계속한다.
- **#90 — 운영 postgres-ai 지연**: `ix_chunks_text_tsv`는 이미 존재하지만 플래너가 사용하지 않고 `Seq Scan on document_chunks`를 선택했다. 매칭은 2,760/10,198행이고 `Rows Removed by Filter: 7438`, `Buffers: shared hit=36401`, `Execution Time: 153.052 ms`였다. 인덱스 부재가 아니라, 바이그램을 `|`로 넓게 이은 tsquery가 전체의 27%를 맞혀 GIN의 이득이 낮다고 플래너가 판단한 것이 현재 진단이다. 다음은 통계·비용 파라미터와 더 선택적인 대표 질의의 계획 비교다.
- **#93 — 운영 로그 redaction**: code가 든 필드를 깨뜨리는 문제를 Sprint 13에서 계속한다. monitoring namespace는 범위 밖이다.

## 교훈

### 한 명의 과거 실패는 전원의 현재 상태가 아니다

하루 전 Finch-mobile 한 명의 셸 오류를 다섯 명 전원의 현재 네트워크 차단으로 일반화해 라운드 하나를 통째로 버렸다. 13:19에 Wiki가 CLI로 발행한 사실을 직접 읽고도 26분 뒤에 같은 결론을 적용했다. 네트워크 가부는 그 에이전트의 이번 전송 결과로 확인해야 한다. 이 규약은 #106, `13e558c3`에 반영했다.

### 이전 발행문의 결론도 관측 시각의 스냅샷이다

15:13과 15:16에 "모바일 무발행 · PR 없음"을 두 번 올렸지만 PR #107은 13:45, #113은 14:02에 이미 존재했다. origin을 본 시각은 13:30대였고, 이후 두 보고는 당시 결론을 다시 쓴 것이었다. **다시 쓰기 전에 다시 잰다 — 특히 "없다"는 주장에 적용한다.**

## Sprint 13 선행

Sprint 13의 범위와 새 판정 기준은 [`sprint-13.md`](sprint-13.md)에 기록한다. #87의 첫 06:30 운영 로그가 다음 스프린트의 첫 검증 게이트다.
