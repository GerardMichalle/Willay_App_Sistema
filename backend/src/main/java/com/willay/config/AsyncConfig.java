package com.willay.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Habilita @Async (usado por la auditoría). */
@Configuration
@EnableAsync
public class AsyncConfig {
}
