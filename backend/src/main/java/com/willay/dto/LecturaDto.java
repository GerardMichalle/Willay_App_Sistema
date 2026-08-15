package com.willay.dto;

/** Lectura procesada; es lo que viaja al monitor en vivo. */
public record LecturaDto(
        Long id,
        Long alumnoId,
        String codigoAlumno,
        String nombre,
        String grado,
        String tarjeta,
        String metodo,
        String tipo,
        String hora,
        String estado,
        String puntoAcceso,
        String fotoUrl
) {}
