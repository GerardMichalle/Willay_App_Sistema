# Willay — Sistema Integral de Gestión Escolar

Sistema web para colegios que automatiza el control de asistencia mediante
tarjetas RFID/NFC o carnets QR, con libreta virtual, reportes exportables,
notificaciones a las familias y acceso por roles. Multi-colegio (multi-tenant
por columna `colegio_id`) desde el diseño.

## Estado de los módulos

| Módulo | Tecnología | Estado |
|---|---|---|
| `frontend/` | React 19 + TypeScript + Vite + Tailwind CSS v4 | ✅ Funcional, conectado al backend real |
| `backend/` | Java 21 · Spring Boot 3.4 · JWT · Flyway | ✅ Funcional (API REST, SSE, exportación, push) |
| `backend/src/main/resources/db/migration/` | PostgreSQL 16 — esquema versionado con Flyway | ✅ V1–V9 aplicadas |
| `docs/` | Documentación del proyecto | 🔜 Carpetas preparadas, contenido pendiente |
| `database/` | Carpeta histórica — el esquema real vive en las migraciones Flyway del backend | ⚠️ Solo placeholders |

## Cómo ejecutar el sistema completo

### 1. Backend + base de datos (un comando)

Requisito único: **Docker Desktop** instalado y abierto.

```bash
cd backend
docker compose up --build
```

Levanta PostgreSQL + la API en `http://localhost:8080` con datos de
demostración (perfil `dev`). Detalle completo, usuarios semilla y perfiles de
entorno en [`backend/README.md`](backend/README.md).

| Servicio | URL |
|---|---|
| API | http://localhost:8080 |
| Swagger | http://localhost:8080/swagger-ui.html |
| Salud | http://localhost:8080/actuator/health |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción
```

Vite hace de proxy: `/api` y `/actuator` → `http://localhost:8080`. Con el
backend en `dev` puedes entrar con cualquiera de los usuarios semilla
(contraseña `demo1234`), p. ej. `patricia.soto@sanmartin.edu.pe`.

La capa de datos del frontend está toda en
[`frontend/src/services/api.ts`](frontend/src/services/api.ts): ninguna
pantalla hace `fetch` por su cuenta. No hay datos simulados.

## Roles y rutas

Los roles del backend (`SUPER_ADMIN`, `ADMIN`, `DIRECCION`, `DOCENTE`,
`ALUMNO`, `APODERADO`) se mapean en el frontend a: `superadmin`, `admin`,
`direccion`, `profesor`, `alumno`, `apoderado`. El "Inicio" (`/`) cambia
según el rol.

| Ruta | Roles con acceso |
|---|---|
| `/` (Inicio) | Todos (contenido según rol) |
| `/matriculas`, `/alumnos`, `/aulas`, `/apoderados`, `/docentes` | admin, dirección |
| `/vincular-tarjetas` | admin |
| `/asistencia/vivo` | admin, dirección, profesor |
| `/asistencia/historial`, `/cursos`, `/comunicados` | cualquier usuario autenticado |
| `/conducta` | admin, dirección, profesor, apoderado |
| `/libretas` | profesor |
| `/reportes`, `/estadisticas` | admin, dirección |
| `/colegios`, `/auditoria` | superadmin |
| `/usuarios`, `/roles`, `/configuracion` | admin |
| `/libreta` | alumno, apoderado, admin, dirección |
| `/mi-perfil` | alumno |

> La guardia de rutas del frontend (`components/Protegida.tsx`) es solo
> visual; el backend valida los permisos en cada endpoint.

## Integración del lector RFID/QR

El dispositivo llama a `POST /api/asistencia/lectura` con la cabecera
`X-Api-Key` (credencial que se genera al registrar el lector en
**Configuración → Lectores**). El backend resuelve el estudiante, decide si
es entrada o salida, clasifica la puntualidad, difunde la lectura por SSE al
monitor en vivo y notifica a los apoderados. Para probar sin hardware:
**Control en vivo → Simular lectura**.

## Despliegue

- **Frontend:** [`frontend/vercel.json`](frontend/vercel.json) reescribe
  `/api` y `/actuator` hacia `https://api.willay.app`.
- **Backend:** [`backend/docker-compose.prod.yml`](backend/docker-compose.prod.yml)
  — no publica el puerto de PostgreSQL, exige los secretos por `.env` y
  desactiva Swagger.

## Pendiente

1. Orquestación full-stack en un solo `docker compose up` (hoy backend y
   frontend se levantan por separado; el proxy de Vite apunta a
   `localhost:8080` y habría que parametrizarlo).
2. Pruebas automatizadas (frontend y backend).
3. Contenido de `docs/`.
