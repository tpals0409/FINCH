package com.finch

import org.springframework.boot.SpringApplication
import org.springframework.boot.autoconfigure.SpringBootApplication

@SpringBootApplication
class FinchApplication {

	companion object {
		@JvmStatic
		fun main(args: Array<String>) {
			SpringApplication.run(FinchApplication::class.java, *args)
		}
	}
}
