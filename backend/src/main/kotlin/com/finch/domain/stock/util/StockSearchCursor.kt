package com.finch.domain.stock.util

import com.finch.global.apiPayload.code.GeneralErrorCode
import com.finch.global.exception.CustomException
import java.nio.charset.StandardCharsets
import java.util.Base64

/** 종목 검색의 복합 정렬 키와 검색어를 묶는 불투명 커서. */
data class StockSearchCursor(
	val keyword: String,
	val exactRank: Int,
	val stockName: String,
	val stockCode: String,
) {
	fun encode(): String {
		val raw = listOf(keyword, exactRank.toString(), stockName, stockCode).joinToString(SEPARATOR)
		return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.toByteArray(StandardCharsets.UTF_8))
	}

	companion object {
		private const val SEPARATOR = "\u0000"

		fun from(keyword: String, cursor: String?): StockSearchCursor? {
			if (cursor.isNullOrBlank()) return null
			return try {
				val fields = String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split(SEPARATOR)
				require(fields.size == 4 && fields[0] == keyword)
				StockSearchCursor(fields[0], fields[1].toInt().also { require(it in 0..1) }, fields[2], fields[3])
			} catch (e: IllegalArgumentException) {
				throw CustomException(GeneralErrorCode.INVALID_REQUEST, mapOf("cursor" to "형식이 올바르지 않습니다"))
			}
		}
	}
}
