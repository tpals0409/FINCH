package com.finch.domain.price

import com.finch.TestcontainersConfiguration
import com.finch.domain.price.client.KisPriceClient
import com.finch.domain.price.repository.PriceCollectionTargetRepository
import com.finch.domain.price.service.KisPriceCollector
import com.finch.domain.price.service.KisRequestPacer
import com.finch.domain.price.service.PriceCollectorLease
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean

/** 운영에서 처음 켜지는 KIS 조건부 빈과 설정값이 실제 Spring 조립을 통과하는지 검증한다. */
@Import(TestcontainersConfiguration::class)
@SpringBootTest(
	properties = [
		"finch.price.kis.enabled=true",
		"KIS_PRICE_BATCH_SIZE=60",
		"KIS_BASE_URL=http://localhost",
		"KIS_APP_KEY=test-app-key",
		"KIS_APP_SECRET=test-app-secret",
	],
)
internal class KisPriceEnabledContextTest {

	@Autowired
	private lateinit var collector: KisPriceCollector

	@Autowired
	private lateinit var targetRepository: PriceCollectionTargetRepository

	@Autowired
	private lateinit var client: KisPriceClient

	@Autowired
	private lateinit var pacer: KisRequestPacer

	/** 장중 실행돼도 스케줄러가 외부 KIS 호출로 진입하지 못하게 임대 획득을 거부한다. */
	@MockitoBean
	private lateinit var lease: PriceCollectorLease

	@Test
	fun `KIS 활성 설정으로 조건부 수집 빈이 조립된다`() {
		assertThat(collector).isNotNull
		assertThat(targetRepository).isNotNull
		assertThat(client).isNotNull
		assertThat(pacer).isNotNull
	}
}
