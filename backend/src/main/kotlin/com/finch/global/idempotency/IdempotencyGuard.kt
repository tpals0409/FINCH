package com.finch.global.idempotency

import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import java.security.MessageDigest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper

/**
 * 본 처리의 결과. `status` 는 최초 응답의 HTTP 상태이고 재생 시에도 같은 값이 나간다 (apiSpec 1.4).
 *
 * `ledgerEntryId` 를 요구하는 이유 — `ck_idempotency_completed` 가 "완료 = 원장에 행이 있다" 를
 * DB 사실로 만든다. 멱등성이 필요한 두 엔드포인트(충전·주문)가 둘 다 원장에 정확히 1행을 쓰므로,
 * 이 값을 낼 수 없는 처리는 애초에 이 가드를 쓸 대상이 아니다.
 */
data class Completion<T : Any>(
	val status: Int,
	val body: T,
	val ledgerEntryId: Long,
)

/** 최초 처리든 재생이든 같은 모양으로 나간다. 컨트롤러는 둘을 구분하지 않는다. */
data class IdempotentResponse<T : Any>(
	val status: Int,
	val body: T,
)

/**
 * 멱등성이 필요한 요청을 감싼다 (apiSpec 1.4 · backConvention 5.3).
 *
 * **처리 위치가 서비스인 이유** — 인터셉터에 두면 예약과 본 처리가 다른 트랜잭션이 되어
 * "원장 INSERT 와 키 표시가 한 트랜잭션" 이 깨진다. backConvention 2.2 는 아직
 * "`global/config` 의 인터셉터" 라고 적고 있지만 §5.3 이 그것을 뒤집었고, §5.3 이 확정이다.
 *
 * **`@Transactional` 이 여기 붙는다.** 그래서 호출하는 도메인 서비스는 트랜잭션을 갖지 않아도 된다 —
 * [execute] 에 넘긴 블록이 이 트랜잭션 안에서 돌고, 그 안에서 `AccountService.post`(`MANDATORY`)와
 * [IdempotencyStore.complete](`MANDATORY`)가 같은 트랜잭션에 합류한다.
 *
 * 블록을 **인자로 받는 것**이 핵심이다. 도메인 서비스가 자기 안의 `@Transactional` 메서드를 부르면
 * 자기 호출이라 프록시를 거치지 않아 트랜잭션이 시작되지 않는다.
 */
@Service
class IdempotencyGuard(
	private val store: IdempotencyStore,
	private val objectMapper: ObjectMapper,
) {

	/**
	 * @param endpoint 해시에 섞지 않고 별도로 저장한다 — 막힌 예약 행을 사람이 읽을 단서다 (V3)
	 * @param request 해시의 재료. 같은 키에 다른 본문이 오면 `IDEMPOTENCY_CONFLICT` 다
	 * @param action 본 처리. **이 트랜잭션 안에서 돈다.** 실패하면 예약 행이 지워져 재시도가 열린다
	 */
	@Transactional
	fun <T : Any> execute(
		userId: Long,
		keyHeader: String?,
		endpoint: String,
		request: Any,
		responseType: Class<T>,
		action: () -> Completion<T>,
	): IdempotentResponse<T> {
		val key = requireKey(keyHeader)
		val hash = sha256(objectMapper.writeValueAsString(request))

		when (val reservation = store.reserve(userId, key, endpoint, hash)) {
			ReservationResult.Fresh -> Unit
			ReservationResult.InProgress ->
				throw CustomException(GeneralErrorCode.IDEMPOTENCY_IN_PROGRESS)
			ReservationResult.Conflict ->
				throw CustomException(GeneralErrorCode.IDEMPOTENCY_CONFLICT)
			is ReservationResult.Replay ->
				return IdempotentResponse(
					reservation.status,
					objectMapper.readValue(reservation.body, responseType),
				)
		}

		// 본 처리와 완료 표시를 같은 try 로 묶는다. 완료 표시만 실패하면 원장은 롤백되는데 예약은
		// 별도 커밋으로 살아남아, 그 키가 24시간 동안 IN_PROGRESS 로 막힌다.
		return try {
			val completion = action()
			store.complete(
				userId,
				key,
				completion.status,
				objectMapper.writeValueAsString(completion.body),
				completion.ledgerEntryId,
			)
			IdempotentResponse(completion.status, completion.body)
		} catch (e: Throwable) {
			// REQUIRES_NEW 라 롤백되는 이 트랜잭션을 잠시 밀어내고 자기 트랜잭션에서 커밋한다.
			store.release(userId, key)
			throw e
		}
	}

	/**
	 * 헤더 누락은 `IDEMPOTENCY_KEY_REQUIRED`, 형식 위반은 `INVALID_REQUEST` 다.
	 *
	 * 길이를 여기서 보는 이유 — `ck_idempotency_key_len` 이 8~64 를 요구하므로 짧은 키를 그냥
	 * 넘기면 제약 위반이 500 으로 나간다. V3 가 키를 UUID 타입으로 두지 않은 것도 같은 이유였다.
	 */
	private fun requireKey(keyHeader: String?): String {
		val key = keyHeader?.trim()
		if (key.isNullOrEmpty()) throw CustomException(GeneralErrorCode.IDEMPOTENCY_KEY_REQUIRED)
		if (key.length !in KEY_LENGTH) throw CustomException(GeneralErrorCode.INVALID_REQUEST)

		return key
	}

	/** `ck_idempotency_hash` 가 `^[0-9a-f]{64}$` 를 요구한다. 대문자 hex 는 제약에 막힌다. */
	private fun sha256(value: String): String =
		MessageDigest.getInstance("SHA-256")
			.digest(value.toByteArray())
			.joinToString("") { "%02x".format(it) }

	companion object {
		/** `ck_idempotency_key_len` 과 같은 범위여야 한다. */
		private val KEY_LENGTH = 8..64
	}
}
