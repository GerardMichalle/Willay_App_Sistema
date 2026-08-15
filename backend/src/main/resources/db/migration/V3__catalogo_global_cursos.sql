ALTER TABLE curso_gratuito ALTER COLUMN colegio_id DROP NOT NULL;

-- El curso de demostración pasa a ser global
UPDATE curso_gratuito SET colegio_id = NULL;

-- Orden de presentación en el catálogo
ALTER TABLE curso_gratuito ADD COLUMN orden SMALLINT NOT NULL DEFAULT 0;

-- Portada opcional del curso
ALTER TABLE curso_gratuito ADD COLUMN portada_url VARCHAR(500);

-- El material puede subir un archivo propio del sistema
ALTER TABLE recurso_curso ADD COLUMN archivo_uuid UUID;

CREATE INDEX idx_curso_gratuito_orden ON curso_gratuito(orden);

-- El material del catálogo global no pertenece a ninguna institución
ALTER TABLE archivo ALTER COLUMN colegio_id DROP NOT NULL;