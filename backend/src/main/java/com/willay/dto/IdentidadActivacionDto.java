package com.willay.dto;

/** Lo que la pantalla de activación muestra al verificar el código. */
public record IdentidadActivacionDto(
        String nombreCompleto,
        String rol,
        String vinculo          // ej. "Apoderado de Valeria Quispe · 5° A"
) {}
