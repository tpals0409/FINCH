---
sprint: 13
title: "스프린트 13"
date: "2026-09-09"
status: active
parts: [backend, frontend, ai, mobile, docs]
related_adrs: ["sprint-12"]
buzz_thread: "086a43dc705e65c26046ddedad2cd84911982716d56c856bbc18b113c52a546e"
topics: [KIS 토큰, 최근 본 종목, postgres-ai 성능, Images CI, iOS, 로그 redaction, NETWORK_ERROR, price_daily 운영 검증]
tldr: "Sprint 13은 Sprint 12 이월과 첫 운영 로그 검증을 처리한다. 토큰 갱신 여유, 핫셋·최근 본 종목, postgres-ai 플래너 진단, 모바일 CI와 iOS PR, 로그 redaction, 005930 NETWORK_ERROR 원인, price_daily 첫 실행을 범위로 삼는다."
---
# Sprint 13

## 목표

Sprint 12에서 이월한 운영·성능·모바일 항목을 처리하고, 스케줄 변경은 첫 실행 로그로 검증한다.

## 범위

- #103 — KIS 토큰 갱신 여유 1분 · 재시도 예산 없음
- #78 — 최근 본 종목 기록 — 핫셋의 빠진 절반
- #90 — postgres-ai 5.6배 — 플래너가 GIN을 안 쓴다 (AI + Pico)
- #115 — PR에서 Images build 잡이 항상 skipped (Fin)
- #113 — iOS 플랫폼 — rebase·CI 완료, Xcode 경로·시뮬레이터 빌드 잔여 (mobile + Leo)
- #93 — 운영 로그 redaction이 `code` 든 필드를 깨뜨린다 (Leo; monitoring namespace는 범위 밖)
- 신규 — 005930 `NETWORK_ERROR` 원인. #112에서 로그 라벨이 구분되었으므로 원인을 확인한다.
- 검증 — `price_daily` 06:30 첫 실행, 2026-09-10 아침 (Pico)

## 이월

Sprint 12에서 다음 항목을 이월했다.

- #103 — KIS 토큰 갱신 여유와 재시도 예산
- #78 — 최근 본 종목과 30종 핫셋 투입·실측
- #90 — 운영 postgres-ai 지연과 GIN 플래너 선택 원인
- #93 — 운영 로그 redaction 회귀
- #87 — `price_daily` 첫 CronJob 실행 관측

## 판정 기준

각 범위 항목은 관련 코드·PR·CI·운영 로그를 근거로 판정한다.

- 구현 항목은 관련 PR이 열리고 CI가 해당 커밋에서 성공해야 한다.
- KIS 항목은 갱신 여유와 재시도 예산을 코드·테스트 근거로 확인한다.
- 검색·성능 변경은 **동일 질의 세트의 결과 집합이 바뀌지 않는 것을 먼저 보이고, 그 다음 지연을 본다.**
- 모바일 PR은 master 기준 rebase 뒤 PR head SHA에 CI가 붙고, iOS 경로와 빌드 결과를 확인한다.
- 스케줄 신설·변경은 **첫 실행의 운영 로그로 판정한다. 머지는 판정이 아니다.**
- `price_daily`는 2026-09-10 06:30 KST 실행 로그와 처리 결과를 확인한다.
- 운영 로그 redaction과 `NETWORK_ERROR`는 실제 출력과 원인 분류가 보존되는지 확인한다.

## 완료 조건

문서 변경은 Sprint 12 종료 절과 Sprint 13 문서 뼈대를 한 PR에 포함한다. CI가 초록이어야 하며, 완료 보고에는 커밋 SHA와 PR 링크를 남긴다.

## 선행

없음.
