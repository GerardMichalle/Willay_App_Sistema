package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CompletarActivacionRequest(
        @NotBlank @Pattern(regexp = "\\d{6}") String codigo,
        @NotBlank @Dni String dni,
        @NotBlank @Size(min = 8, max = 72, message = "La contraseña debe tener al menos 8 caracteres") String password
) {}
