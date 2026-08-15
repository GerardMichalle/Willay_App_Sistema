package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerificarActivacionRequest(
        @NotBlank @Pattern(regexp = "\\d{6}", message = "El código tiene 6 dígitos") String codigo,
        @NotBlank @Dni String dni
) {}
