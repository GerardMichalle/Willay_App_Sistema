-- =====================================================================
-- WILLAY · V2: Libretas, notas por curso, destinatarios y archivos
-- =====================================================================

CREATE TABLE curso (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    nombre          VARCHAR(120) NOT NULL,
    abreviatura     VARCHAR(20),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, nombre)
);
CREATE INDEX idx_curso_colegio ON curso(colegio_id);

-- Libreta: un registro por alumno y periodo
CREATE TABLE libreta (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id       BIGINT NOT NULL REFERENCES alumno(id) ON DELETE CASCADE,
    periodo         VARCHAR(20) NOT NULL,
    anio_escolar    SMALLINT NOT NULL,
    promedio        NUMERIC(4,2),
    observacion     VARCHAR(500),
    publicada_en    TIMESTAMPTZ,                   -- NULL = borrador
    publicada_por   BIGINT REFERENCES usuario(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (alumno_id, periodo, anio_escolar)
);
CREATE INDEX idx_libreta_colegio ON libreta(colegio_id, anio_escolar);
CREATE INDEX idx_libreta_alumno ON libreta(alumno_id);

CREATE TABLE nota (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    libreta_id      BIGINT NOT NULL REFERENCES libreta(id) ON DELETE CASCADE,
    curso_id        BIGINT NOT NULL REFERENCES curso(id),
    calificacion    NUMERIC(4,2) NOT NULL CHECK (calificacion >= 0 AND calificacion <= 20),
    comentario      VARCHAR(300),
    registrado_por  BIGINT REFERENCES usuario(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (libreta_id, curso_id)
);
CREATE INDEX idx_nota_libreta ON nota(libreta_id);

ALTER TABLE comunicado ADD COLUMN dirigido_a VARCHAR(20) NOT NULL DEFAULT 'TODOS'
    CHECK (dirigido_a IN ('TODOS','APODERADOS','DOCENTES','ALUMNOS'));

-- Archivos (fotos de perfil y material de cursos)
CREATE TABLE archivo (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    nombre_original VARCHAR(255) NOT NULL,
    tipo_mime       VARCHAR(100) NOT NULL,
    tamano_bytes    BIGINT NOT NULL,
    contenido       BYTEA NOT NULL,
    subido_por      BIGINT REFERENCES usuario(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_archivo_colegio ON archivo(colegio_id);
