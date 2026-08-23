-- Suscripciones a notificaciones push del navegador (Web Push / VAPID).
-- Un usuario puede tener varias: un dispositivo o navegador por suscripción.
CREATE TABLE push_suscripcion (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      VARCHAR(255) NOT NULL,
    auth        VARCHAR(255) NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_suscripcion_usuario ON push_suscripcion(usuario_id);
