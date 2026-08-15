package com.willay.dto;

import jakarta.validation.constraints.*;

public record GuardarAulaRequest(
        @NotBlank @Pattern(regexp = "INICIAL|PRIMARIA|SECUNDARIA", message = "Nivel inválido") String nivel,
        @NotBlank @Size(max = 10) String grado,
        @NotBlank @Size(max = 5) String seccion,
        @Min(2020) @Max(2100) int anioEscolar,
        Long sedeId
) {}
