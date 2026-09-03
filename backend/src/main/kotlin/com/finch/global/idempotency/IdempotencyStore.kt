package com.finch.global.idempotency

import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * 예약 INSERT 의 결과. apiSpec 1.4 의 다섯 상황 중 헤더 누락을 뺀 넷에 1:1 대응한다.
 *
 * 해시 비교를 여기서 끝내고 결과만 내보내는 이유 — 비교에 필요한 두 값(요청 해시와 저장된 해시)이
 * 모두 이 계층에 있다. 위로 올리면 저장된 해시를 밖으로 내보내야 한다.
 */
sealed interface ReservationResult {

	/** 처음 보는 키. 본 처리로 간다. */
	data object Fresh : ReservationResult

	/** 같은 키가 처리 중이다. 클라이언트는 짧게 대기 후 **같은 키로** 재시도한다. */
	data object InProgress : ReservationResult

	/** 완료 · 동일 본문. 저장된 응답을 그대로 재생한다. */
	data class Replay(val status: Int, val body: String) : ReservationResult

	/** 완료 · 다른 본문. 클라이언트 버그 신호이므로 재시도하지 않는다. */
	data object Conflict : ReservationResult
}

/**
 * 멱등성 레코드의 트랜잭션 경계를 소유한다. **경계가 세 종류로 갈리는 것이 이 클래스의 존재 이유다.**
 *
 * | 메서드 | 전파 | 왜 |
 * |---|---|---|
 * | [reserve] | `REQUIRES_NEW` | 예약이 **독립적으로 커밋**돼야 한다. 본 트랜잭션과 한 덩어리면 PK 충돌이 에러가 아니라 대기가 되고, `IDEMPOTENCY_IN_PROGRESS` 가 영원히 안 나온다 |
 * | [complete] | `MANDATORY` | 원장 INSERT 와 **한 트랜잭션**이어야 한다. 갈라지면 원장에는 행이 있는데 키는 미처리로 남고, 다음 재시도가 같은 주문을 한 번 더 낸다 (V3 머리말) |
 * | [release] | `REQUIRES_NEW` | 본 트랜잭션이 롤백되는 중에 불린다. 그 트랜잭션에 얹으면 함께 롤백돼 예약이 안 지워진다 |
 *
 * 이 셋을 한 메서드에 담을 수 없어서 클래스가 [IdempotencyGuard] 와 나뉜다 — Spring 의 전파 속성은
 * 프록시를 거친 호출에만 적용되므로 같은 빈 안에서 서로 부르면 전부 무력화된다.
 */
@Service
class IdempotencyStore(
	private val repository: IdempotencyRecordRepository,
) {

	/**
	 * 키를 예약하고, 이미 있으면 그 행의 상태로 판정한다.
	 *
	 * 판정의 출발점은 조회가 아니라 **INSERT 의 성패**다 (backConvention 5.3).
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	fun reserve(userId: Long, key: String, endpoint: String, hash: String): ReservationResult {
		if (repository.reserve(userId, key, endpoint, hash) == 1) return ReservationResult.Fresh

		val record = repository.findById(IdempotencyId(userId, key)).orElse(null)
			// 예약과 조회 사이에 다른 요청이 실패해 예약 행을 지웠다. 재시도하면 이 요청이 이긴다.
			?: return ReservationResult.InProgress

		if (record.status == IdempotencyStatus.IN_PROGRESS) return ReservationResult.InProgress
		if (record.requestHash != hash || record.endpoint != endpoint) return ReservationResult.Conflict

		// ck_idempotency_completed 가 "완료 = 응답과 원장 행이 있다" 를 보장하므로 여기서 null 이면
		// DB 제약이 깨진 것이다. 400 이나 409 가 아니라 서버가 고칠 상태다.
		val body = record.responseBody ?: throw CustomException(GeneralErrorCode.INTERNAL_ERROR)
		val status = record.responseStatus?.toInt()
			?: throw CustomException(GeneralErrorCode.INTERNAL_ERROR)

		return ReservationResult.Replay(status, body)
	}

	/** 본 처리와 같은 트랜잭션에서 완료로 표시한다. */
	@Transactional(propagation = Propagation.MANDATORY)
	fun complete(userId: Long, key: String, status: Int, body: String, ledgerEntryId: Long) {
		val record = repository.findById(IdempotencyId(userId, key))
			.orElseThrow { CustomException(GeneralErrorCode.INTERNAL_ERROR) }

		record.complete(status, body, ledgerEntryId)
	}

	/** 실패한 예약을 지운다. 남기면 그 키가 24시간 동안 재시도 불가가 된다. */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	fun release(userId: Long, key: String) {
		repository.deleteById(IdempotencyId(userId, key))
	}
}
