# Base de datos — PostgreSQL

> **El esquema real ya no vive aquí.** Está versionado con Flyway en el
> backend:
>
> - Estructura: `backend/src/main/resources/db/migration/` (V1–V9)
> - Datos de demostración (solo perfil `dev`): `backend/src/main/resources/db/seed/`
>
> JPA está en modo `validate`: el esquema **solo** cambia añadiendo una
> migración nueva. Ver [`backend/README.md`](../backend/README.md).

Esta carpeta se conserva para diagramas entidad-relación y scripts sueltos de
apoyo; las subcarpetas `scripts/`, `migrations/` y `diagrams/` están vacías
por ahora.

Decisiones de diseño: multi-tenant por columna (`colegio_id` en toda tabla
clave, el valor sale del JWT), contraseñas con hash BCrypt, y cada tabla de
negocio lleva `uuid` global + `actualizado_en` para una futura sincronización.
