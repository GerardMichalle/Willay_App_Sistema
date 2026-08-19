package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompletarRecuperacionRequest(
        @NotBlank(message = "Indica tu correo") String correo,
        @NotBlank(message = "Indica el código") @Size(min = 6, max = 6, message = "El código tiene 6 dígitos") String codigo,
        @NotBlank(message = "La nueva contraseña es obligatoria")
        @Size(min = 8, message = "La nueva contraseña debe tener al menos 8 caracteres")
        String passwordNueva
) {}
