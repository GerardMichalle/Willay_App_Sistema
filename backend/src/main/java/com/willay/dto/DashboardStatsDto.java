package com.willay.dto;

import java.util.List;

/**
 * Indicadores del dashboard institucional.
 * Todos los valores provienen de conteos reales sobre la base de datos,
 * acotados al colegio del usuario autenticado.
 */
public record DashboardStatsDto(
        long presentes,
        long totalAlumnos,
        long tardanzas,
        long ausentes,
        long docentesActivos,
        long docentesTotal,
        long apoderadosConCuenta,
        long apoderadosTotal,
        long lectoresEnLinea,
        long lectoresTotal,
        long comunicadosPublicados,
        List<EntradasDiaDto> semana
) {
    public record EntradasDiaDto(String fecha, String diaCorto, long entradas) {}
}
