-- Registro manual del proveedor sobre si un colegio está al día con su
-- mensualidad. No hay pasarela de cobro involucrada: el Superadmin lo
-- actualiza a mano.
ALTER TABLE colegio ADD COLUMN estado_pago VARCHAR(20) NOT NULL DEFAULT 'AL_DIA';
ALTER TABLE colegio ADD COLUMN proximo_vencimiento DATE;
