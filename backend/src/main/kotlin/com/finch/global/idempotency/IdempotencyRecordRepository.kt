package com.finch.global.idempotency

import java.util.Optional
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

interface IdempotencyRecordRepository : Repository<IdempotencyRecord, IdempotencyId> {

	/**
	 * 예약 INSERT. **반환값이 판정 그 자체다** — 1 이면 이 요청이 이겼고, 0 이면 같은 키가 이미 있다.
	 *
	 * `ON CONFLICT DO NOTHING` 을 쓰는 이유가 둘이다.
	 *
	 * 1. **조회 후 INSERT 가 아니다.** JPA `save` 는 SELECT 후 persist 라 두 요청이 모두 "없음" 을
	 *    볼 수 있다. backConvention 5.3 이 그 방식을 명시적으로 기각했다
	 * 2. **예외로 판정하지 않는다.** `DataIntegrityViolationException` 을 잡는 형태면 그 트랜잭션이
	 *    rollback-only 로 표시돼 이후 조회조차 못 한다
	 *
	 * 미커밋 충돌 행이 있으면 Postgres 는 그 트랜잭션이 끝날 때까지 **기다린다.** 예약은
	 * `REQUIRES_NEW` 로 즉시 커밋되는 짧은 트랜잭션이므로, 대기는 상대의 본 처리가 아니라
	 * 상대의 예약까지만이다.
	 */
	@Modifying
	@Query(
		value = """
			INSERT INTO idempotency_record
			       (user_id, idempotency_key, endpoint, request_hash, status, created_at)
			VALUES (:userId, :key, :endpoint, :hash, 'IN_PROGRESS', now())
			ON CONFLICT (user_id, idempotency_key) DO NOTHING
		""",
		nativeQuery = true,
	)
	fun reserve(
		@Param("userId") userId: Long,
		@Param("key") key: String,
		@Param("endpoint") endpoint: String,
		@Param("hash") hash: String,
	): Int

	fun findById(id: IdempotencyId): Optional<IdempotencyRecord>

	/**
	 * 실패한 예약을 지운다. **남기면 실패한 요청이 24시간 동안 재시도 불가가 된다**
	 * (backConvention 5.3).
	 */
	fun deleteById(id: IdempotencyId)
}
