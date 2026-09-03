package com.finch.global.util

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId

/**
 * apiSpec 1.1 은 모든 시각을 **KST 오프셋 포함** ISO 8601 로 정했다 (`2026-08-25T10:00:00+09:00`).
 *
 * `Instant` 를 그대로 내보내면 Jackson 이 `2026-08-25T01:00:00Z` 로 쓴다. ISO 8601 이긴 하지만
 * 오프셋이 Z 라 계약과 다르고, 프론트가 문자열을 그대로 보여주는 자리에서 하루가 밀린다.
 *
 * `UserMeRes` 가 이 변환을 자기 안에 들고 있었고 "두 번째 엔드포인트가 생기면 global 로 올려라" 를
 * 주석으로 남겼다. Sprint 4 가 시각 필드 셋(`asOf`·`depositedAt`·`occurredAt`)을 한꺼번에 더하므로
 * 그 조건이 충족됐다 — 도메인마다 `ZoneId.of("Asia/Seoul")` 을 적으면 어느 날 하나만 UTC 로 갈라진다.
 *
 * DB 는 `TIMESTAMPTZ` 로 UTC 를 저장하고 변환은 **응답 경계에서만** 한다.
 * 내부 계산과 비교는 `Instant` 로 한다 — 오프셋이 붙은 타입으로 계산하면 등호가 지역시간에 좌우된다.
 */
val KST: ZoneId = ZoneId.of("Asia/Seoul")

/** 응답 DTO 를 만드는 자리에서만 부른다. */
fun Instant.toKst(): OffsetDateTime = atZone(KST).toOffsetDateTime()
