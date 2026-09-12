package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record RegistrarFcmTokenRequest(@NotBlank String token) {}
