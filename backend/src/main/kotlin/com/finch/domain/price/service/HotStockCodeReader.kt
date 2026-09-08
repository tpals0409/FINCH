package com.finch.domain.price.service

import com.finch.domain.price.repository.PriceCollectionTargetRepository
import org.springframework.stereotype.Service

/** 현재가·캔들 수집기가 같은 전역 핫셋 종목코드 프로젝션을 공유하는 읽기 경계다. */
@Service
internal class HotStockCodeReader(private val repository: PriceCollectionTargetRepository) {
	fun first(limit: Int): List<String> = repository.findAfter("", limit)
}
