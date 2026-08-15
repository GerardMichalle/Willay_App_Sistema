package com.willay.dto;

/**
 * Resultado de una matrícula: incluye los códigos de activación que la
 * secretaría entregará a la familia (impresos o por WhatsApp).
 */
public record MatriculaResultadoDto(
        Long alumnoId,
        String codigoAlumno,
        String nombreAlumno,
        String aula,
        String tarjetaRfid,
        Long apoderadoId,
        String nombreApoderado,
        String codigoActivacionApoderado,
        String codigoActivacionAlumno
) {}
