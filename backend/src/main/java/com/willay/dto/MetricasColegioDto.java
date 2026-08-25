package com.willay.dto;

import java.time.OffsetDateTime;

/** Actividad reciente de un colegio cliente, para el panel del proveedor. */
public record MetricasColegioDto(
        long lecturasSemana,
        long comunicadosPublicadosTotal,
        OffsetDateTime ultimaActividad
) {}
