package com.willay.entity;

/**
 * Roles del sistema.
 * SUPER_ADMIN es personal del proveedor (Willay), no pertenece a ningún
 * colegio y es el único que puede crear instituciones nuevas.
 */
public enum Rol {
    SUPER_ADMIN, ADMIN, DIRECCION, DOCENTE, ALUMNO, APODERADO
}
