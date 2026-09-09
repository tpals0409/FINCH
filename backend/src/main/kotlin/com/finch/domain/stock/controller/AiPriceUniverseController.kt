package com.finch.domain.stock.controller

import com.finch.domain.stock.dto.response.PriceUniverseRes
import com.finch.domain.stock.service.StockService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/internal/v1/ai")
class AiPriceUniverseController(
	private val stockService: StockService,
) {
	@GetMapping("/price-universe")
	fun priceUniverse(
		@RequestParam(required = false) cursor: String?,
		@RequestParam(defaultValue = "100") size: Int,
	): PriceUniverseRes = stockService.getPriceUniverse(cursor, size)
}
