package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record DesuscribirPushRequest(@NotBlank String endpoint) {}
