package com.finch.global.idempotency

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.io.Serializable
import java.time.Instant
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/** `IN_PROGRESS` 가 11자라 스키마의 `VARCHAR(11)` 이 이 두 값만 담는다. */
enum class IdempotencyStatus {
	IN_PROGRESS,
	COMPLETED,
}

/**
 * 복합 키 `(user_id, idempotency_key)`. **이 제약이 동시 요청을 직렬화하는 지점이다** —
 * "같은 키로 두 번 → 원장 행이 안 는다" 의 근거가 PK 하나다 (V3 머리말).
 *
 * 키를 전역 UNIQUE 로 두지 않고 사용자에 가둔 이유도 V3 에 있다 — 전역이면 남의 키 존재 여부가
 * 응답으로 새어 나간다.
 */
@Embeddable
data class IdempotencyId(
	@Column(name = "user_id", nullable = false)
	val userId: Long,

	@Column(name = "idempotency_key", nullable = false, length = 64)
	val idempotencyKey: String,
) : Serializable

/**
 * `idempotency_record` 테이블 (V3). 충전과 주문의 멱등성 키를 담는다.
 *
 * **INSERT 는 이 엔티티로 하지 않는다.** [IdempotencyStore.reserve] 가 네이티브
 * `ON CONFLICT DO NOTHING` 으로 넣는다 — JPA `save` 는 조회 후 INSERT 라 두 요청이 모두 "없음" 을
 * 볼 수 있고, backConvention 5.3 이 명시적으로 기각한 판정 방식이다. 이 엔티티는 **읽기와 갱신용**이다.
 *
 * 도메인을 참조하지 않는다 — `ledgerEntryId` 는 `Long` 하나이고 `LedgerEntry` 를 import 하지 않는다.
 * `global` 은 `domain` 을 참조하지 않는다 (backConvention 2.4 규칙 1).
 */
@Entity
@Table(name = "idempotency_record")
class IdempotencyRecord {

	@EmbeddedId
	final lateinit var id: IdempotencyId
		private set

	/**
	 * 같은 키를 다른 엔드포인트에 쓴 경우를 가른다. **본문 해시에 경로를 섞지 않고 컬럼으로 분리한
	 * 이유는 사람이다** — 막힌 `IN_PROGRESS` 행을 볼 때 어느 엔드포인트인지 알 유일한 단서다 (V3).
	 */
	@Column(nullable = false, updatable = false, length = 64)
	final lateinit var endpoint: String
		private set

	/**
	 * 정규화한 요청 본문의 SHA-256 소문자 hex. **동일 요청과 다른 요청을 가르는 유일한 근거다.**
	 *
	 * `@JdbcTypeCode(CHAR)` 를 적은 이유 — 스키마가 `CHAR(64)` 인데 Hibernate 는 `String` 을 기본으로
	 * `varchar` 로 매핑해 `ddl-auto: validate` 가 막는다. `columnDefinition` 만으로는 안 되고,
	 * `validate` 는 문자열이 아니라 **JDBC 타입 코드**를 비교하므로 코드 자체를 바꿔야 한다.
	 *
	 * 길이가 항상 64 로 고정이라 스키마가 `CHAR` 를 고른 것이고, 그 선택을 매핑이 따라간다.
	 * `stock_code CHAR(6)` 도 같은 처리가 필요하다 — 종목 엔티티를 만들 때 이 자리를 참고한다.
	 */
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(nullable = false, updatable = false, length = 64)
	final lateinit var requestHash: String
		private set

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 11)
	final var status: IdempotencyStatus = IdempotencyStatus.IN_PROGRESS
		private set

	/** `SMALLINT` 이므로 `Short` 다. `Int` 로 두면 `ddl-auto: validate` 가 타입 불일치로 막는다. */
	@Column
	final var responseStatus: Short? = null
		private set

	/**
	 * 완료 시 재생할 응답 본문. **원장에서 다시 만들지 않고 저장한다** — 만들면 엔드포인트마다
	 * 재생 경로를 따로 짜야 하고, 그 경로가 최초 응답과 같다는 보장이 없다 (V3).
	 */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	final var responseBody: String? = null
		private set

	/** 이 키가 만든 원장 행. `uq_idempotency_ledger` 가 키와 원장 행의 1:1 을 지킨다. */
	@Column
	final var ledgerEntryId: Long? = null
		private set

	@Column(nullable = false, updatable = false)
	final lateinit var createdAt: Instant
		private set

	/**
	 * 완료로 표시한다. **본 처리와 같은 트랜잭션에서만 부른다** ([IdempotencyStore.complete]).
	 *
	 * 네 값을 한꺼번에 넣는 이유는 `ck_idempotency_completed` 다 — 완료 행은 응답과 원장 행을
	 * 반드시 갖는다는 것을 DB 가 검사하므로, 나눠 넣으면 중간 상태에서 제약에 막힌다.
	 */
	fun complete(responseStatus: Int, responseBody: String, ledgerEntryId: Long) {
		this.status = IdempotencyStatus.COMPLETED
		this.responseStatus = responseStatus.toShort()
		this.responseBody = responseBody
		this.ledgerEntryId = ledgerEntryId
	}
}
