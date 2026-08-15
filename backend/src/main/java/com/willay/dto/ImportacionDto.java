package com.willay.dto;

import java.util.List;

/**
 * Vista previa de una importación masiva.
 * La regla de oro: NADA se guarda hasta que el usuario confirma. Primero
 * ve exactamente qué filas entrarán y cuáles tienen errores.
 */
public record ImportacionDto(
        int totalFilas,
        int validas,
        int conError,
        List<FilaDto> filas
) {
    public record FilaDto(
            int numeroFila,
            String nombresAlumno,
            String apellidosAlumno,
            String dniAlumno,
            String aula,
            String nombresApoderado,
            String apellidosApoderado,
            String dniApoderado,
            String telefonoApoderado,
            String correoApoderado,
            String tarjetaRfid,
            boolean valida,
            List<String> errores
    ) {}
}
