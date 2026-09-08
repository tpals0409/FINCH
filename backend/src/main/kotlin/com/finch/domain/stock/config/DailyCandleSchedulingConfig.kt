package com.finch.domain.stock.config

import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

/** AI 일봉 동기화 스케줄을 활성화한다. */
@Configuration
@EnableScheduling
internal class DailyCandleSchedulingConfig
