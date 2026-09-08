package com.finch.domain.stock.config

import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

/** KIS 현재가 수집 설정과 무관하게 종목 마스터의 일 배치를 활성화한다. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
internal class PreviousCloseSchedulingConfig
