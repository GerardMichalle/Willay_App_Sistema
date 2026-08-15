package com.willay.dto;

/** Aula para selectores del frontend. */
public record AulaDto(
        Long id,
        String nivel,
        String grado,
        String seccion,
        int anioEscolar,
        String etiqueta,
        long totalAlumnos
) {}
