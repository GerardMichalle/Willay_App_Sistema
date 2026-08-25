package com.willay.dto;

public record UsuarioDto(
        Long id,
        String nombres,
        String apellidos,
        String correo,
        String rol,
        String fotoUrl,
        Long colegioId,
        String colegioNombre,
        String colegioLogoUrl
) {}
