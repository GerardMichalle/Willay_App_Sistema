-- =====================================================================
-- WILLAY · DATOS DE DEMOSTRACIÓN — SOLO PERFIL 'dev'
--
-- Esta carpeta (db/seed) se carga únicamente cuando el perfil activo es
-- 'dev'. En 'prod' Flyway no la ve, por lo que una instalación real
-- arranca COMPLETAMENTE VACÍA: 0 alumnos, 0 docentes, 0 asistencias.
--
-- La versión 900 deja espacio libre (V2..V899) para migraciones reales
-- de estructura sin colisionar con la semilla.
--
-- Contraseña de todos los usuarios demo: demo1234
-- =====================================================================

INSERT INTO colegio (id, nombre, codigo_modular, color_marca) VALUES
  (1, 'I.E.P. San Martín', '0568211', '#E02D2D');
SELECT setval('colegio_id_seq', 1);

INSERT INTO sede (id, colegio_id, nombre, direccion) VALUES
  (1, 1, 'Sede Central', 'Av. Los Próceres 1234');
SELECT setval('sede_id_seq', 1);

INSERT INTO usuario (id, colegio_id, correo, clave_hash, rol, nombres, apellidos, dni, telefono, estado) VALUES
  (1, 1, 'patricia.soto@sanmartin.edu.pe', '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'ADMIN',     'Patricia', 'Soto Ramírez',    '40111222', '999111222', 'ACTIVO'),
  (2, 1, 'direccion@sanmartin.edu.pe',     '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'DIRECCION', 'Ricardo',  'Palomino Vega',   '40333444', '999333444', 'ACTIVO'),
  (3, 1, 'c.mendoza@sanmartin.edu.pe',     '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'DOCENTE',   'Carlos',   'Mendoza Silva',   '40555666', '999555666', 'ACTIVO'),
  (4, 1, 'valeria.quispe@sanmartin.edu.pe','$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'ALUMNO',    'Valeria',  'Quispe Rojas',    '61234567', NULL,        'ACTIVO'),
  (5, 1, 'rosa.rojas@gmail.com',           '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'APODERADO', 'Rosa',     'Rojas Medina',    '42715836', '987654321', 'ACTIVO'),
  (6, 1, 'm.fernandez@sanmartin.edu.pe',   '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa', 'DOCENTE',   'María',    'Fernández Torres','40777888', '999777888', 'ACTIVO'),
  (7, 1, 'mfernandez@gmail.com',           NULL,                                                            'APODERADO', 'Mario',    'Fernández Ruiz',  '40128457', '912345678', 'PENDIENTE');
SELECT setval('usuario_id_seq', 7);

INSERT INTO aula (id, colegio_id, sede_id, nivel, grado, seccion, anio_escolar) VALUES
  (1, 1, 1, 'PRIMARIA', '5', 'A', 2026),
  (2, 1, 1, 'PRIMARIA', '5', 'B', 2026),
  (3, 1, 1, 'PRIMARIA', '4', 'B', 2026),
  (4, 1, 1, 'PRIMARIA', '3', 'C', 2026),
  (5, 1, 1, 'PRIMARIA', '2', 'A', 2026);
SELECT setval('aula_id_seq', 5);

INSERT INTO docente (id, colegio_id, usuario_id, especialidad) VALUES
  (1, 1, 3, 'Matemática'),
  (2, 1, 6, 'Comunicación');
SELECT setval('docente_id_seq', 2);

INSERT INTO docente_aula (colegio_id, docente_id, aula_id, es_tutor) VALUES
  (1, 1, 1, TRUE),
  (1, 2, 3, TRUE);

INSERT INTO alumno (id, colegio_id, usuario_id, aula_id, codigo, nombres, apellidos, dni, fecha_nacimiento) VALUES
  (1, 1, 4,    1, 'A-2041', 'Valeria',   'Quispe Rojas',   '61234567', '2014-07-30'),
  (2, 1, NULL, 1, 'A-2042', 'Diego',     'Fernández Luna', '61234568', '2014-03-12'),
  (3, 1, NULL, 3, 'A-2043', 'Camila',    'Torres Vega',    '61234569', '2015-11-02'),
  (4, 1, NULL, 4, 'A-2044', 'Mateo',     'Huamán Ríos',    '61234570', '2016-01-20'),
  (5, 1, NULL, 2, 'A-2045', 'Luciana',   'Paredes Cruz',   '61234571', '2014-07-30'),
  (6, 1, NULL, 5, 'A-2046', 'Sebastián', 'Chávez Mori',    '61234572', '2017-09-15');
SELECT setval('alumno_id_seq', 6);

INSERT INTO apoderado (id, colegio_id, usuario_id, nombres, apellidos, dni, telefono, correo) VALUES
  (1, 1, 5, 'Rosa',  'Rojas Medina',   '42715836', '987654321', 'rosa.rojas@gmail.com'),
  (2, 1, 7, 'Mario', 'Fernández Ruiz', '40128457', '912345678', 'mfernandez@gmail.com'),
  (3, 1, NULL, 'Julia', 'Ríos Chumpitaz', '41893265', '955443322', 'julia.rios@gmail.com');
SELECT setval('apoderado_id_seq', 3);

INSERT INTO alumno_apoderado (colegio_id, alumno_id, apoderado_id, parentesco) VALUES
  (1, 1, 1, 'MADRE'),
  (1, 2, 2, 'PADRE'),
  (1, 4, 3, 'MADRE');

INSERT INTO punto_acceso (id, colegio_id, sede_id, nombre, api_key_hash) VALUES
  (1, 1, 1, 'Puerta principal · Lector A', '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa'),
  (2, 1, 1, 'Puerta posterior · Lector A', '$2b$10$OTNN/BQhwZgUC.cSnXWQFux1PdwqDwLThpelmKnpBsTDCnRsmSJZa');
SELECT setval('punto_acceso_id_seq', 2);

INSERT INTO tarjeta_rfid (colegio_id, alumno_id, codigo) VALUES
  (1, 1, 'RF-88213'), (1, 2, 'RF-88214'), (1, 3, 'RF-88215'),
  (1, 4, 'RF-88216'), (1, 5, 'RF-88217'), (1, 6, 'RF-88218');

INSERT INTO asistencia (colegio_id, alumno_id, fecha, hora_entrada, estado) VALUES
  (1, 1, CURRENT_DATE, '07:42', 'PUNTUAL'),
  (1, 2, CURRENT_DATE, '08:14', 'TARDANZA'),
  (1, 3, CURRENT_DATE, '07:38', 'PUNTUAL'),
  (1, 4, CURRENT_DATE, NULL,    'AUSENTE'),
  (1, 5, CURRENT_DATE, '07:29', 'PUNTUAL'),
  (1, 6, CURRENT_DATE, '08:07', 'TARDANZA');

INSERT INTO registro_acceso (colegio_id, alumno_id, punto_acceso_id, tarjeta_codigo, metodo, tipo, momento) VALUES
  (1, 1, 1, 'RF-88213', 'RFID', 'ENTRADA', CURRENT_DATE + TIME '07:42'),
  (1, 3, 1, 'RF-88215', 'RFID', 'ENTRADA', CURRENT_DATE + TIME '07:38'),
  (1, 5, 1, 'RF-88217', 'RFID', 'ENTRADA', CURRENT_DATE + TIME '07:29'),
  (1, 6, 1, 'RF-88218', 'RFID', 'ENTRADA', CURRENT_DATE + TIME '08:07'),
  (1, 2, 1, 'RF-88214', 'RFID', 'ENTRADA', CURRENT_DATE + TIME '08:14');

INSERT INTO conducta (colegio_id, alumno_id, registrado_por, tipo, categoria, descripcion, fecha) VALUES
  (1, 1, 2, 'MERITO',   'Representación',     'Primer puesto en concurso de matemática UGEL.', CURRENT_DATE - 2),
  (1, 2, 3, 'DEMERITO', 'Tardanza reiterada', 'Tercera tardanza en la semana.',                CURRENT_DATE);

INSERT INTO comunicado (id, colegio_id, autor_id, aula_id, titulo, cuerpo, publicado_en) VALUES
  (1, 1, 2, NULL, 'Horario especial por Fiestas Patrias',
   'El día viernes la salida será a las 12:30 p. m. para todos los niveles.', now() - INTERVAL '2 days'),
  (2, 1, 2, NULL, 'Campaña de vacunación escolar',
   'En coordinación con el MINSA se realizará la campaña de vacunación.', now() - INTERVAL '3 days');
SELECT setval('comunicado_id_seq', 2);

INSERT INTO evento (colegio_id, titulo, tipo, fecha, hora, lugar) VALUES
  (1, 'Actuación por Fiestas Patrias',    'CIVICO',    CURRENT_DATE + 1, '09:00', 'Patio central'),
  (1, 'Reunión de apoderados · 5° grado', 'REUNION',   CURRENT_DATE + 5, '18:30', 'Aula 5°A'),
  (1, 'Entrega de libretas · I Bimestre', 'ACADEMICO', CURRENT_DATE + 8, '08:00', 'Aulas por grado');

INSERT INTO curso_gratuito (id, colegio_id, titulo, descripcion) VALUES
  (1, 1, 'Economía y Finanzas',
   'Aprende a ahorrar, hacer un presupuesto y emprender desde el colegio.');
SELECT setval('curso_gratuito_id_seq', 1);

INSERT INTO categoria_curso (id, curso_id, nombre, orden) VALUES
  (1, 1, 'Educación financiera básica', 1),
  (2, 1, 'Ahorro y presupuesto',        2),
  (3, 1, 'Emprendimiento escolar',      3);
SELECT setval('categoria_curso_id_seq', 3);

INSERT INTO recurso_curso (categoria_id, titulo, tipo, tamano_bytes, duracion_seg, orden, subido_por) VALUES
  (1, '¿Qué es el dinero? · Guía ilustrada',  'PDF',   2516582, NULL, 1, 1),
  (1, 'El ahorro explicado en 5 minutos',     'VIDEO', NULL,    312,  2, 1),
  (2, 'Presupuesto familiar para niños',      'PDF',   1887436, NULL, 1, 1),
  (2, 'Cuento: La hormiga ahorradora',        'LIBRO', 5347737, NULL, 2, 1),
  (3, 'Cómo crear tu primer negocio escolar', 'VIDEO', NULL,    760,  1, 1);

INSERT INTO configuracion (colegio_id, clave, valor) VALUES
  (1, 'HORA_TOLERANCIA', '08:00'),
  (1, 'CANAL_AVISOS',    'WHATSAPP'),
  (1, 'ANIO_ESCOLAR',    '2026');

-- Código de activación de prueba: 482913 + DNI 40128457 (Mario, apoderado PENDIENTE)
INSERT INTO codigo_activacion (colegio_id, usuario_id, codigo, dni, expira_en) VALUES
  (1, 7, '482913', '40128457', now() + INTERVAL '30 days');

-- ── Cursos del plan (perfil dev) ─────────────────────────────────────
INSERT INTO curso (id, colegio_id, nombre, abreviatura) VALUES
  (1, 1, 'Matemática', 'MAT'),
  (2, 1, 'Comunicación', 'COM'),
  (3, 1, 'Ciencia y Tecnología', 'CyT'),
  (4, 1, 'Personal Social', 'PS'),
  (5, 1, 'Educación Física', 'EF'),
  (6, 1, 'Arte y Cultura', 'ART');
SELECT setval('curso_id_seq', 6);
