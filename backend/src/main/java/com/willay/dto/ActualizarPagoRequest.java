package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record ActualizarPagoRequest(
        @NotBlank @Pattern(regexp = "AL_DIA|PENDIENTE|VENCIDO", message = "Estado de pago inválido") String estadoPago,
        LocalDate proximoVencimiento
) {}
