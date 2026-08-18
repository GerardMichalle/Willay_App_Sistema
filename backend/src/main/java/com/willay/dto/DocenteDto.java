package com.willay.dto;

import java.util.List;

public record DocenteDto(
        Long id,
        Long usuarioId,
        String nombres,
        String apellidos,
        String correo,
        String dni,
        String telefono,
        String especialidad,
        String estado,
        String estadoCuenta,
        String codigoActivacion,
        String fotoUrl,
        List<AulaResumen> aulas
) {
    public record AulaResumen(Long id, String etiqueta, boolean esTutor) {}
}
