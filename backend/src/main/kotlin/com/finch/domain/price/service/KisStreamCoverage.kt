package com.finch.domain.price.service

import java.util.concurrent.ConcurrentHashMap
import org.springframework.stereotype.Component

/** 웹소켓 구독 성공 종목을 REST 폴백에서 제외하기 위한 현재 커버리지다. */
internal interface KisStreamCoverage {

	fun covers(stockCode: String): Boolean

	fun replace(stockCodes: Set<String>)

	fun clear()

	companion object {
		val NONE = object : KisStreamCoverage {
			override fun covers(stockCode: String): Boolean = false
			override fun replace(stockCodes: Set<String>) = Unit
			override fun clear() = Unit
		}
	}
}

@Component
internal class KisStreamCoverageState : KisStreamCoverage {

	private val covered = ConcurrentHashMap.newKeySet<String>()

	override fun covers(stockCode: String): Boolean = stockCode in covered

	override fun replace(stockCodes: Set<String>) {
		covered.retainAll(stockCodes)
		covered.addAll(stockCodes)
	}

	override fun clear() = covered.clear()
}
