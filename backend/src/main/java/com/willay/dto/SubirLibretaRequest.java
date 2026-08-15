package com.willay.dto;

import jakarta.validation.constraints.*;

public record SubirLibretaRequest(
        @NotNull Long alumnoId,
        @NotBlank String periodo,
        @Min(2020) @Max(2100) int anioEscolar,
        @NotBlank String archivoUrl
) {}
