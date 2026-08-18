package com.willay.dto;

import java.util.List;

public record ApoderadoDto(
        Long id,
        String nombres,
        String apellidos,
        String dni,
        String telefono,
        String correo,
        String estadoCuenta,
        String codigoActivacion,
        String fotoUrl,
        List<HijoResumen> hijos
) {
    public record HijoResumen(Long id, String codigo, String nombre, String aula, String parentesco) {}
}
