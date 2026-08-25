package com.willay.dto;

/** Avance de implementación de un colegio cliente, para el panel del proveedor. */
public record ChecklistColegioDto(
        long aulas,
        long docentes,
        long alumnos,
        long alumnosConTarjeta,
        long apoderadosConCuenta,
        long lectoresRegistrados,
        boolean tieneComunicadoPublicado
) {}
