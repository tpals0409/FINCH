package com.finch.domain.order.entity

/** 주문 방향 (apiSpec 7.1). 스키마의 `ck_trade_side` 가 같은 두 값만 허용한다. */
enum class OrderSide { BUY, SELL }
