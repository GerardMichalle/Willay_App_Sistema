package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record EliminarFcmTokenRequest(@NotBlank String token) {}
