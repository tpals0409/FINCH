package com.finch

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.containers.GenericContainer
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

// 하위 패키지의 테스트에서도 @Import 할 수 있도록 public 으로 연다.
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	fun postgresContainer(): PostgreSQLContainer =
		PostgreSQLContainer(DockerImageName.parse("postgres:latest"))

	// GenericContainer 의 SELF 재귀 제네릭은 Kotlin 에서 raw 로 쓸 수 없다. Nothing 으로 닫고
	// 빈 타입만 스타 프로젝션으로 내보낸다 — 자바가 raw 타입으로 쓰던 자리와 같다.
	@Bean
	@ServiceConnection(name = "redis")
	fun redisContainer(): GenericContainer<*> =
		GenericContainer<Nothing>(DockerImageName.parse("redis:latest")).apply { setExposedPorts(listOf(6379)) }
}
