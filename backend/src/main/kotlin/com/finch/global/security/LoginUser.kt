package com.finch.global.security

/**
 * 인증된 사용자의 ID 를 컨트롤러 파라미터로 받는다. auth 작업의 최종 산출물이고
 * **다른 도메인이 사용자 식별에 쓰는 유일한 수단**이다.
 *
 * ```
 * @GetMapping("/portfolio")
 * fun get(@LoginUser userId: Long): PortfolioRes { ... }
 * ```
 *
 * **userId 를 경로·본문·쿼리로 받지 않는다** (apiSpec 1.2, 프론트 contracts C25). 받으면 남의 숫자를
 * 적어 넣는 것만으로 남의 계좌가 열린다 — 서명된 토큰이 있어도 서버가 그 값을 안 쓰면 의미가 없다.
 * 이 어노테이션은 "식별자는 토큰에서만 나온다" 를 컨트롤러 시그니처에 못 박는 장치다.
 *
 * 타입은 `Long` 이다. 값이 없는 경우를 컨트롤러가 다룰 일이 없으므로
 * (`authenticated()` 를 통과하지 못하면 컨트롤러에 아예 닿지 않는다) null 을 넘기지 않는다.
 *
 * @see LoginUserArgumentResolver
 */
@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class LoginUser
