package com.finch

import org.springframework.boot.SpringApplication

object TestFinchApplication {

	@JvmStatic
	fun main(args: Array<String>) {
		SpringApplication.from { a -> FinchApplication.main(a) }
			.with(TestcontainersConfiguration::class.java)
			.run(*args)
	}
}
