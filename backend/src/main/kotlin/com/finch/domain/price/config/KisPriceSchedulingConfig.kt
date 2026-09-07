package com.finch.domain.price.config

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling

/** KIS 수집을 명시적으로 켠 환경에서만 스케줄러를 활성화한다. */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class KisPriceSchedulingConfig
