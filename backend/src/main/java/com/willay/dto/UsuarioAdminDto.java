package com.willay.dto;

public record UsuarioAdminDto(
        Long id,
        String nombres,
        String apellidos,
        String correo,
        String rol,
        String estado,
        String dni,
        String telefono,
        String ultimoAcceso,
        String codigoActivacion,
        String fotoUrl
) {}
