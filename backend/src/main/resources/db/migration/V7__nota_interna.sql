-- Bitácora del Superadmin sobre cada colegio cliente (contacto, vencimiento
-- de contrato, incidencias). Uso exclusivamente interno del proveedor.
CREATE TABLE nota_interna (
    id          BIGSERIAL PRIMARY KEY,
    colegio_id  BIGINT NOT NULL REFERENCES colegio(id) ON DELETE CASCADE,
    autor_id    BIGINT NOT NULL REFERENCES usuario(id),
    contenido   TEXT NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nota_interna_colegio ON nota_interna(colegio_id);
