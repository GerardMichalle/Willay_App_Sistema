-- Código de un solo uso para "olvidé mi contraseña". Vida corta (minutos,
-- no días como el de activación) porque se pide y se usa en el mismo momento.
CREATE TABLE codigo_recuperacion (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    codigo      VARCHAR(6) NOT NULL,
    expira_en   TIMESTAMPTZ NOT NULL,
    usado_en    TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recuperacion_busqueda ON codigo_recuperacion(usuario_id, codigo);
