package com.willay.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

public record GuardarLibretaRequest(
        @NotNull Long alumnoId,
        @NotBlank String periodo,
        @Min(2020) @Max(2100) int anioEscolar,
        @Size(max = 500) String observacion,
        @Valid List<NotaItem> notas,
        boolean publicar
) {
    public record NotaItem(
            @NotNull Long cursoId,
            @DecimalMin(value = "0.0", message = "La nota mínima es 0")
            @DecimalMax(value = "20.0", message = "La nota máxima es 20")
            double calificacion,
            @Size(max = 300) String comentario
    ) {}
}
