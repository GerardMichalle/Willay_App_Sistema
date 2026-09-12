-- Tokens de dispositivo para notificaciones push nativas (Firebase Cloud
-- Messaging), en paralelo a push_suscripcion (Web Push / VAPID, navegador).
-- Un usuario puede tener varios dispositivos; un token por fila.
CREATE TABLE fcm_token (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fcm_token_usuario ON fcm_token(usuario_id);
