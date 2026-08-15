package com.willay.dto;

import java.time.OffsetDateTime;

/** Colegio con sus métricas, para el panel del proveedor. */
public record ColegioDto(
        Long id,
        String nombre,
        String codigoModular,
        String ruc,
        String colorMarca,
        boolean activo,
        long alumnos,
        long docentes,
        long apoderados,
        long usuariosActivos,
        OffsetDateTime creadoEn
) {}
