package com.willay.dto;

import java.time.OffsetDateTime;

/** Historial de avisos del Superadmin a los administradores de todos los colegios. */
public record ComunicadoGlobalDto(
        Long id,
        String titulo,
        String mensaje,
        String autorNombre,
        int destinatarios,
        OffsetDateTime creadoEn
) {}
