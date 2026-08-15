package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record GuardarRecursoRequest(
        @NotBlank(message = "El título es obligatorio") @Size(max = 200) String titulo,
        @NotBlank @Pattern(regexp = "PDF|VIDEO|LIBRO|IMAGEN", message = "Tipo inválido") String tipo,
        @Size(max = 500) String urlArchivo,
        Long tamanoBytes,
        Integer duracionSeg,
        int orden
) {}