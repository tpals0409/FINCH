package com.finch.domain.stock.entity

import java.time.LocalDate

/**
 * 캔들 조회 기간 (apiSpec 5.3). 전부 일봉 기준이고, 분봉은 확장 범위다(`[S0-4]`).
 *
 * 기간을 열거형으로 받는 이유는 임의의 `from`·`to` 를 열면 전 구간 조회가 가능해져
 * 한 요청이 종목 하나의 일봉을 통째로 끌어올 수 있어서다.
 */
enum class CandlePeriod(private val days: Long) {
	`1M`(30),
	`3M`(90),
	`1Y`(365),
	;

	/** 달력 기준으로 뺀다. 거래일 기준이 아니라 휴장일만큼 개수가 적게 나오는 게 정상이다. */
	fun from(today: LocalDate): LocalDate = today.minusDays(days)
}
