-- =====================================================================
-- WILLAY · V1: Esquema inicial
-- Multi-tenant por colegio_id. Preparado para sincronización futura:
-- toda tabla de negocio lleva un `uuid` global y `actualizado_en`.
-- =====================================================================

-- ── Núcleo institucional ─────────────────────────────────────────────
CREATE TABLE colegio (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    nombre          VARCHAR(160) NOT NULL,
    codigo_modular  VARCHAR(20),
    ruc             VARCHAR(11),
    logo_url        VARCHAR(400),
    color_marca     VARCHAR(9),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sede (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    nombre          VARCHAR(120) NOT NULL,
    direccion       VARCHAR(240),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, nombre)
);
CREATE INDEX idx_sede_colegio ON sede(colegio_id);

-- ── Usuarios y seguridad ─────────────────────────────────────────────
-- El rol se modela como enum de texto validado por CHECK; la matriz fina
-- de permisos vive en `permiso_rol` para poder ajustarla sin migrar.
CREATE TABLE usuario (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    -- NULL solo para SUPER_ADMIN (personal del proveedor, no pertenece a un colegio)
    colegio_id      BIGINT REFERENCES colegio(id),
    correo          VARCHAR(160) NOT NULL,
    clave_hash      VARCHAR(72),                -- NULL hasta activar la cuenta
    rol             VARCHAR(20) NOT NULL CHECK (rol IN ('SUPER_ADMIN','ADMIN','DIRECCION','DOCENTE','ALUMNO','APODERADO')),
    nombres         VARCHAR(120) NOT NULL,
    apellidos       VARCHAR(120) NOT NULL,
    dni             VARCHAR(12),
    telefono        VARCHAR(20),
    foto_url        VARCHAR(400),
    estado          VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ACTIVO','SUSPENDIDO')),
    ultimo_acceso   TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Un colegio no puede repetir correo; el correo es además la credencial de login
    UNIQUE (colegio_id, correo),
    -- Coherencia del modelo: solo SUPER_ADMIN puede no tener colegio
    CONSTRAINT ck_usuario_colegio CHECK (
        (rol = 'SUPER_ADMIN' AND colegio_id IS NULL) OR
        (rol <> 'SUPER_ADMIN' AND colegio_id IS NOT NULL)
    )
);
-- El login busca por correo: debe ser único en toda la plataforma
CREATE UNIQUE INDEX uq_usuario_correo_global ON usuario(lower(correo));
CREATE INDEX idx_usuario_colegio ON usuario(colegio_id);
CREATE INDEX idx_usuario_correo  ON usuario(correo);
CREATE INDEX idx_usuario_dni     ON usuario(colegio_id, dni);

CREATE TABLE permiso_rol (
    id          BIGSERIAL PRIMARY KEY,
    colegio_id  BIGINT NOT NULL REFERENCES colegio(id),
    rol         VARCHAR(20) NOT NULL,
    permiso     VARCHAR(60) NOT NULL,
    concedido   BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (colegio_id, rol, permiso)
);

CREATE TABLE refresh_token (
    id          BIGSERIAL PRIMARY KEY,
    token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    expira_en   TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_usuario ON refresh_token(usuario_id);

CREATE TABLE codigo_activacion (
    id          BIGSERIAL PRIMARY KEY,
    colegio_id  BIGINT NOT NULL REFERENCES colegio(id),
    usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    codigo      VARCHAR(6) NOT NULL,
    dni         VARCHAR(12) NOT NULL,
    expira_en   TIMESTAMPTZ NOT NULL,
    usado_en    TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, codigo)
);
CREATE INDEX idx_codigo_busqueda ON codigo_activacion(colegio_id, codigo, dni);

-- ── Estructura académica ─────────────────────────────────────────────
CREATE TABLE aula (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    sede_id         BIGINT NOT NULL REFERENCES sede(id),
    nivel           VARCHAR(15) NOT NULL CHECK (nivel IN ('INICIAL','PRIMARIA','SECUNDARIA')),
    grado           VARCHAR(10) NOT NULL,
    seccion         VARCHAR(5)  NOT NULL,
    anio_escolar    SMALLINT NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, sede_id, nivel, grado, seccion, anio_escolar)
);
CREATE INDEX idx_aula_colegio ON aula(colegio_id);

CREATE TABLE docente (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    usuario_id      BIGINT NOT NULL UNIQUE REFERENCES usuario(id),
    especialidad    VARCHAR(120),
    estado          VARCHAR(15) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','LICENCIA','CESADO')),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_docente_colegio ON docente(colegio_id);

-- Asignación docente↔aula (tutoría o dictado). Base del filtro "solo mi aula".
CREATE TABLE docente_aula (
    id          BIGSERIAL PRIMARY KEY,
    colegio_id  BIGINT NOT NULL REFERENCES colegio(id),
    docente_id  BIGINT NOT NULL REFERENCES docente(id) ON DELETE CASCADE,
    aula_id     BIGINT NOT NULL REFERENCES aula(id)    ON DELETE CASCADE,
    es_tutor    BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (docente_id, aula_id)
);
CREATE INDEX idx_docente_aula_aula ON docente_aula(aula_id);

CREATE TABLE alumno (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    usuario_id      BIGINT UNIQUE REFERENCES usuario(id),   -- puede no tener cuenta aún
    aula_id         BIGINT REFERENCES aula(id),
    codigo          VARCHAR(15) NOT NULL,                    -- ej. A-2041
    nombres         VARCHAR(120) NOT NULL,
    apellidos       VARCHAR(120) NOT NULL,
    dni             VARCHAR(12),
    fecha_nacimiento DATE,
    foto_url        VARCHAR(400),
    estado          VARCHAR(15) NOT NULL DEFAULT 'MATRICULADO' CHECK (estado IN ('MATRICULADO','RETIRADO','TRASLADADO','EGRESADO')),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, codigo)
);
CREATE INDEX idx_alumno_colegio ON alumno(colegio_id);
CREATE INDEX idx_alumno_aula    ON alumno(aula_id);
CREATE INDEX idx_alumno_nombre  ON alumno(colegio_id, apellidos, nombres);

CREATE TABLE apoderado (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    usuario_id      BIGINT UNIQUE REFERENCES usuario(id),
    nombres         VARCHAR(120) NOT NULL,
    apellidos       VARCHAR(120) NOT NULL,
    dni             VARCHAR(12) NOT NULL,
    telefono        VARCHAR(20),
    correo          VARCHAR(160),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, dni)
);
CREATE INDEX idx_apoderado_colegio ON apoderado(colegio_id);

-- Vínculo N:M — un apoderado puede tener varios hijos y viceversa.
CREATE TABLE alumno_apoderado (
    id            BIGSERIAL PRIMARY KEY,
    colegio_id    BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id     BIGINT NOT NULL REFERENCES alumno(id)    ON DELETE CASCADE,
    apoderado_id  BIGINT NOT NULL REFERENCES apoderado(id) ON DELETE CASCADE,
    parentesco    VARCHAR(20) NOT NULL DEFAULT 'APODERADO',
    es_principal  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (alumno_id, apoderado_id)
);
CREATE INDEX idx_aa_apoderado ON alumno_apoderado(apoderado_id);

-- ── Control de acceso físico ─────────────────────────────────────────
CREATE TABLE punto_acceso (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    sede_id         BIGINT NOT NULL REFERENCES sede(id),
    nombre          VARCHAR(80) NOT NULL,                    -- "Puerta principal · Lector A"
    api_key_hash    VARCHAR(72) NOT NULL,                    -- credencial del dispositivo
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_latido   TIMESTAMPTZ,                             -- heartbeat para "en línea"
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_punto_colegio ON punto_acceso(colegio_id);

CREATE TABLE tarjeta_rfid (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id       BIGINT NOT NULL REFERENCES alumno(id) ON DELETE CASCADE,
    codigo          VARCHAR(40) NOT NULL,                    -- UID físico, ej. RF-88213
    estado          VARCHAR(15) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','PERDIDA','ANULADA')),
    emitida_en      DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, codigo)
);
CREATE INDEX idx_tarjeta_alumno ON tarjeta_rfid(alumno_id);
-- Solo una tarjeta ACTIVA por alumno
CREATE UNIQUE INDEX uq_tarjeta_activa_por_alumno ON tarjeta_rfid(alumno_id) WHERE estado = 'ACTIVA';

-- ── Asistencia ───────────────────────────────────────────────────────
CREATE TABLE registro_acceso (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id       BIGINT NOT NULL REFERENCES alumno(id),
    punto_acceso_id BIGINT REFERENCES punto_acceso(id),
    tarjeta_codigo  VARCHAR(40),
    metodo          VARCHAR(10) NOT NULL DEFAULT 'RFID' CHECK (metodo IN ('RFID','QR','MANUAL')),
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA')),
    momento         TIMESTAMPTZ NOT NULL DEFAULT now(),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_acceso_alumno_dia ON registro_acceso(alumno_id, momento);
CREATE INDEX idx_acceso_colegio_dia ON registro_acceso(colegio_id, momento);

-- Resumen diario derivado de los registros (1 fila por alumno y fecha).
CREATE TABLE asistencia (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id       BIGINT NOT NULL REFERENCES alumno(id),
    fecha           DATE NOT NULL,
    hora_entrada    TIME,
    hora_salida     TIME,
    estado          VARCHAR(15) NOT NULL CHECK (estado IN ('PUNTUAL','TARDANZA','AUSENTE','JUSTIFICADO')),
    justificacion   VARCHAR(300),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (alumno_id, fecha)
);
CREATE INDEX idx_asistencia_colegio_fecha ON asistencia(colegio_id, fecha);
CREATE INDEX idx_asistencia_estado ON asistencia(colegio_id, fecha, estado);

-- ── Conducta ─────────────────────────────────────────────────────────
CREATE TABLE conducta (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    alumno_id       BIGINT NOT NULL REFERENCES alumno(id) ON DELETE CASCADE,
    registrado_por  BIGINT NOT NULL REFERENCES usuario(id),
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('MERITO','DEMERITO')),
    categoria       VARCHAR(60) NOT NULL,
    descripcion     VARCHAR(500) NOT NULL,
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conducta_alumno ON conducta(alumno_id);
CREATE INDEX idx_conducta_colegio_fecha ON conducta(colegio_id, fecha);

-- ── Comunicación ─────────────────────────────────────────────────────
CREATE TABLE comunicado (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    autor_id        BIGINT NOT NULL REFERENCES usuario(id),
    aula_id         BIGINT REFERENCES aula(id),              -- NULL = todo el colegio
    titulo          VARCHAR(200) NOT NULL,
    cuerpo          TEXT NOT NULL,
    publicado_en    TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comunicado_colegio ON comunicado(colegio_id, publicado_en);

CREATE TABLE comunicado_lectura (
    id             BIGSERIAL PRIMARY KEY,
    comunicado_id  BIGINT NOT NULL REFERENCES comunicado(id) ON DELETE CASCADE,
    usuario_id     BIGINT NOT NULL REFERENCES usuario(id)    ON DELETE CASCADE,
    leido_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (comunicado_id, usuario_id)
);

CREATE TABLE evento (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    titulo          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(15) NOT NULL CHECK (tipo IN ('ACADEMICO','CIVICO','DEPORTIVO','REUNION')),
    fecha           DATE NOT NULL,
    hora            TIME,
    lugar           VARCHAR(160),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evento_colegio_fecha ON evento(colegio_id, fecha);

CREATE TABLE notificacion (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    usuario_id      BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    tipo            VARCHAR(25) NOT NULL,                    -- INGRESO_HIJO, COMUNICADO, LIBRETA…
    titulo          VARCHAR(160) NOT NULL,
    cuerpo          VARCHAR(500),
    canal           VARCHAR(15) NOT NULL DEFAULT 'APP' CHECK (canal IN ('APP','WHATSAPP','SMS','CORREO')),
    enviada_en      TIMESTAMPTZ,
    leida_en        TIMESTAMPTZ,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_usuario ON notificacion(usuario_id, leida_en);

-- ── Cursos gratuitos ─────────────────────────────────────────────────
CREATE TABLE curso_gratuito (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    titulo          VARCHAR(160) NOT NULL,
    descripcion     VARCHAR(600),
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categoria_curso (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    curso_id        BIGINT NOT NULL REFERENCES curso_gratuito(id) ON DELETE CASCADE,
    nombre          VARCHAR(160) NOT NULL,
    orden           SMALLINT NOT NULL DEFAULT 0,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_categoria_curso ON categoria_curso(curso_id);

CREATE TABLE recurso_curso (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    categoria_id    BIGINT NOT NULL REFERENCES categoria_curso(id) ON DELETE CASCADE,
    titulo          VARCHAR(200) NOT NULL,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('PDF','VIDEO','LIBRO','IMAGEN')),
    url_archivo     VARCHAR(500),
    tamano_bytes    BIGINT,
    duracion_seg    INTEGER,
    orden           SMALLINT NOT NULL DEFAULT 0,
    subido_por      BIGINT REFERENCES usuario(id),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recurso_categoria ON recurso_curso(categoria_id);

-- ── Reportes y auditoría ─────────────────────────────────────────────
CREATE TABLE reporte_generado (
    id              BIGSERIAL PRIMARY KEY,
    uuid            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    solicitado_por  BIGINT NOT NULL REFERENCES usuario(id),
    tipo            VARCHAR(40) NOT NULL,                    -- ASISTENCIA_MENSUAL, TARDANZAS…
    parametros      JSONB,
    url_archivo     VARCHAR(500),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reporte_colegio ON reporte_generado(colegio_id, creado_en);

CREATE TABLE auditoria (
    id              BIGSERIAL PRIMARY KEY,
    colegio_id      BIGINT REFERENCES colegio(id),
    usuario_id      BIGINT REFERENCES usuario(id),
    accion          VARCHAR(60) NOT NULL,                    -- LOGIN_OK, LOGIN_FALLIDO, CREAR_ALUMNO…
    entidad         VARCHAR(40),
    entidad_id      BIGINT,
    detalle         VARCHAR(600),
    ip              VARCHAR(45),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_colegio ON auditoria(colegio_id, creado_en);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id, creado_en);

-- ── Configuración por colegio (clave-valor tipado simple) ────────────
CREATE TABLE configuracion (
    id              BIGSERIAL PRIMARY KEY,
    colegio_id      BIGINT NOT NULL REFERENCES colegio(id),
    clave           VARCHAR(60) NOT NULL,                    -- HORA_TOLERANCIA, CANAL_AVISOS…
    valor           VARCHAR(300) NOT NULL,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (colegio_id, clave)
);
