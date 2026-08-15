package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GuardarCategoriaRequest(
        @NotBlank(message = "El nombre del módulo es obligatorio") @Size(max = 160) String nombre,
        int orden
) {}