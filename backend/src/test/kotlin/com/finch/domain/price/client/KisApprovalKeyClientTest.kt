package com.finch.domain.price.client

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.boot.test.system.CapturedOutput
import org.springframework.boot.test.system.OutputCaptureExtension
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.reactive.function.client.ClientRequest
import org.springframework.web.reactive.function.client.ClientResponse
import org.springframework.web.reactive.function.client.WebClient
import reactor.core.publisher.Mono
import tools.jackson.databind.ObjectMapper

@ExtendWith(OutputCaptureExtension::class)
internal class KisApprovalKeyClientTest {

	@Test
	fun `approval_key를 발급하지만 키와 인증정보를 로그에 남기지 않는다`(output: CapturedOutput) {
		val client = KisApprovalKeyClient(
			webClient = WebClient.builder()
				.exchangeFunction { request: ClientRequest ->
					assertThat(request.url().path).isEqualTo("/oauth2/Approval")
					Mono.just(
						ClientResponse.create(HttpStatus.OK)
							.header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
							.body("{\"approval_key\":\"approval-secret\"}")
							.build(),
					)
					}
					.build(),
			objectMapper = ObjectMapper(),
			appKey = "app-key-secret",
			appSecret = "app-secret-secret",
		)

		assertThat(client.issue()).isEqualTo("approval-secret")
		assertThat(output).doesNotContain("approval-secret", "app-key-secret", "app-secret-secret")
	}
}
