package com.willay.dto;

/** Progreso de la configuración inicial de un colegio nuevo. */
public record SetupEstadoDto(
        String colegioNombre,
        boolean tieneLogo,
        long aulas,
        long docentes,
        long alumnos,
        long puntosAcceso,
        boolean completo,
        int porcentaje,
        String siguientePaso
) {}
