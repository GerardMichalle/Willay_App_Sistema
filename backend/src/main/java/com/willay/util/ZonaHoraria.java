package com.willay.util;

import java.time.ZoneId;

/**
 * Huso horario único del sistema: todos los colegios operan en Perú.
 * El servidor corre en UTC, así que cualquier fecha/hora que se muestre o
 * se calcule como "hoy" debe pasar por aquí explícitamente.
 */
public final class ZonaHoraria {

    private ZonaHoraria() {}

    public static final ZoneId LIMA = ZoneId.of("America/Lima");
}
