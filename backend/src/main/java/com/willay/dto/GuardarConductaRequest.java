package com.willay.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record GuardarConductaRequest(
        @NotNull(message = "Debe indicar el estudiante") Long alumnoId,
        @NotBlank @Pattern(regexp = "MERITO|DEMERITO", message = "Tipo inválido") String tipo,
        @NotBlank(message = "La categoría es obligatoria") @Size(max = 60) String categoria,
        @NotBlank(message = "La descripción es obligatoria") @Size(max = 500) String descripcion,
        LocalDate fecha
) {}
