package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record SolicitarRecuperacionRequest(
        @NotBlank(message = "Indica tu correo") String correo
) {}
