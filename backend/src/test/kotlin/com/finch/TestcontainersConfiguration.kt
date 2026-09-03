package com.finch

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.containers.GenericContainer
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

// 하위 패키지의 테스트에서도 @Import 할 수 있도록 public 으로 연다.
//
// **이미지 태그는 운영과 같은 것으로 고정한다.** `latest` 를 쓰면 테스트가 운영에서 도는 버전을
// 한 번도 검증하지 않는다 — 오늘 통과한 테스트가 내일 다른 이미지로 도는 것도 문제지만,
// 그보다 큰 문제는 어느 날 통과하든 그게 운영의 증거가 아니라는 점이다.
// 운영 태그의 진실은 finch-gitops 다: platform/data/postgres-backend.yaml · redis.yaml.
// 그쪽을 올릴 때 이 파일도 같이 올린다.
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	fun postgresContainer(): PostgreSQLContainer =
		PostgreSQLContainer(DockerImageName.parse(POSTGRES_IMAGE))

	// GenericContainer 의 SELF 재귀 제네릭은 Kotlin 에서 raw 로 쓸 수 없다. Nothing 으로 닫고
	// 빈 타입만 스타 프로젝션으로 내보낸다 — 자바가 raw 타입으로 쓰던 자리와 같다.
	@Bean
	@ServiceConnection(name = "redis")
	fun redisContainer(): GenericContainer<*> =
		GenericContainer<Nothing>(DockerImageName.parse(REDIS_IMAGE)).apply { setExposedPorts(listOf(6379)) }

	companion object {
		// finch-gitops platform/data/postgres-backend.yaml 의 image 와 같아야 한다.
		// pg_trgm 은 기본 배포판에 포함되므로 V1 의 CREATE EXTENSION 이 이 이미지에서 그대로 돈다.
		const val POSTGRES_IMAGE = "postgres:17"

		// finch-gitops platform/data/redis.yaml 의 image 와 같아야 한다.
		const val REDIS_IMAGE = "redis:7-alpine"
	}
}
