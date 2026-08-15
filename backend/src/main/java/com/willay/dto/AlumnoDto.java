package com.willay.dto;

import java.time.LocalDate;

/** Alumno tal como lo consume el listado del frontend. */
public record AlumnoDto(
        Long id,
        String codigo,
        String nombres,
        String apellidos,
        String dni,
        LocalDate fechaNacimiento,
        String fotoUrl,
        String estado,
        Long aulaId,
        String grado,
        String seccion,
        String nivel,
        String tarjetaRfid,
        String apoderado,
        String telefonoApoderado,
        String entradaHoy,
        String salidaHoy,
        String estadoHoy
) {}
