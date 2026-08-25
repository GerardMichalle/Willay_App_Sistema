-- Historial de avisos que el Superadmin envía a los administradores de
-- todos los colegios activos (mantenimiento, funciones nuevas, etc.).
-- Vive aparte de "comunicado": ese es del colegio hacia su propia
-- comunidad; este es del proveedor hacia los administradores.
CREATE TABLE comunicado_global (
    id            BIGSERIAL PRIMARY KEY,
    titulo        VARCHAR(200) NOT NULL,
    mensaje       TEXT NOT NULL,
    autor_id      BIGINT NOT NULL REFERENCES usuario(id),
    destinatarios INT NOT NULL,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
