package com.willay.dto;

public record ConductaDto(
        Long id,
        Long alumnoId,
        String alumno,
        String codigoAlumno,
        String aula,
        String tipo,
        String categoria,
        String descripcion,
        String fecha,
        String registradoPor
) {}
