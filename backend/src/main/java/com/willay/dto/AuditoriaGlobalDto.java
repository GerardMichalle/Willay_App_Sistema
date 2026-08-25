package com.willay.dto;

import java.time.OffsetDateTime;

/** Evento de auditoría de cualquier colegio, para el panel del proveedor. */
public record AuditoriaGlobalDto(
        Long id,
        OffsetDateTime creadoEn,
        Long colegioId,
        String colegioNombre,
        String accion,
        String detalle
) {}
