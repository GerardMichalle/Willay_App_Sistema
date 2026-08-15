package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GuardarCursoRequest(
        @NotBlank(message = "El título es obligatorio") @Size(max = 160) String titulo,
        @Size(max = 600) String descripcion,
        @Size(max = 500) String portadaUrl,
        int orden
) {}