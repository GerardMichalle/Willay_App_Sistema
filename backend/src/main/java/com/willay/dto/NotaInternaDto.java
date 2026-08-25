package com.willay.dto;

import java.time.OffsetDateTime;

/** Nota interna del proveedor sobre un colegio cliente. */
public record NotaInternaDto(
        Long id,
        String contenido,
        String autorNombre,
        OffsetDateTime creadoEn
) {}
