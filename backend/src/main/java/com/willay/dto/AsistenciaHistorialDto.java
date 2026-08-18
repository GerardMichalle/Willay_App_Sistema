package com.willay.dto;

/** Una fila real de historial de asistencia (pantalla Historial / Mi asistencia). */
public record AsistenciaHistorialDto(
        Long alumnoId,
        String codigoAlumno,
        String nombreAlumno,
        String grado,
        String seccion,
        String fecha,
        String horaEntrada,
        String horaSalida,
        String estado
) {}
