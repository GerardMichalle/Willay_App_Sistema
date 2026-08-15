# Willay · Backend

API del sistema de gestión escolar Willay. Java 21 · Spring Boot 3 · PostgreSQL · Flyway · JWT.

## Levantar todo con un comando

Requisito único: **Docker Desktop** instalado y abierto.

```bash
cd backend
docker compose up --build
```

La primera vez tarda unos minutos (descarga Maven y dependencias dentro del contenedor).
Cuando veas `Started WillayApplication`, ya está arriba:

| Servicio    | URL                                    |
|-------------|----------------------------------------|
| API         | http://localhost:8080                  |
| Swagger     | http://localhost:8080/swagger-ui.html  |
| Salud       | http://localhost:8080/actuator/health  |
| PostgreSQL  | localhost:5432 · bd `willay` · usuario `willay` / `willay-local` |

Para apagar: `Ctrl+C` y `docker compose down`. Los datos persisten en un volumen;
si quieres empezar de cero: `docker compose down -v`.

## Perfiles de entorno

| Perfil | Para qué | Datos iniciales |
|--------|----------|-----------------|
| `dev`  | Tu máquina | Estructura + colegio de demostración |
| `test` | Pruebas automatizadas | Solo estructura |
| `prod` | Instalación en un colegio | **Solo estructura: base vacía** |

Las migraciones viven en dos carpetas: `db/migration` (estructura, siempre se
aplica) y `db/seed` (datos demo, **solo** el perfil `dev` la carga). Por eso una
instalación real arranca con 0 alumnos, 0 docentes y 0 asistencias.

En producción se usa `docker-compose.prod.yml`, que además no publica el puerto
de PostgreSQL, exige los secretos por `.env` y desactiva Swagger.

## Primer arranque en una instalación limpia

Con la base vacía nadie podría entrar, así que el sistema crea la cuenta del
proveedor (`SUPER_ADMIN`) leyendo `BOOTSTRAP_EMAIL` y `BOOTSTRAP_PASSWORD`.
Solo ocurre si no existe ningún usuario. Desde esa cuenta se registran los
colegios, y cada colegio recibe su propia cuenta de administrador.

## Usuarios semilla del perfil dev (contraseña: `demo1234`)

| Rol       | Correo                              |
|-----------|-------------------------------------|
| Admin     | patricia.soto@sanmartin.edu.pe      |
| Dirección | direccion@sanmartin.edu.pe          |
| Docente   | c.mendoza@sanmartin.edu.pe          |
| Alumno    | valeria.quispe@sanmartin.edu.pe     |
| Apoderado | rosa.rojas@gmail.com                |

**Código de activación de prueba** (flujo "Activar mi cuenta"):
código `482913` + DNI `40128457` (Mario Fernández, apoderado pendiente).

## Probar el login (curl o Swagger)

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"patricia.soto@sanmartin.edu.pe","password":"demo1234"}'
```

Respuesta: `accessToken` (30 min), `refreshToken` (14 días) y el perfil del usuario.
En Swagger usa el botón **Authorize** pegando el accessToken para probar rutas protegidas.

## Módulos de la API

| Área | Endpoints principales | Permisos |
|------|----------------------|----------|
| Autenticación | `/api/auth/login`, `/refresh`, `/logout`, `/yo` | Público / autenticado |
| Activación | `/api/activacion/verificar`, `/completar` | Público |
| Dashboard | `/api/dashboard/stats` | Admin, Dirección |
| Alumnos | `GET/POST/PUT/DELETE /api/alumnos` | Lectura por rol; escritura solo Admin |
| Aulas | `GET/POST/PUT/DELETE /api/aulas` | Escritura solo Admin |
| Docentes | `GET/POST/PUT/DELETE /api/docentes` | Escritura solo Admin |
| Apoderados | `GET /api/apoderados` | Admin, Dirección |
| Matrículas | `POST /api/matriculas`, `/importar/previsualizar`, `/importar/confirmar`, `/plantilla` | Solo Admin |
| Credenciales | `GET /api/credenciales/alumno/{id}/qr` | Personal, el propio alumno o su apoderado |
| Configuración inicial | `GET /api/setup/estado` | Admin, Dirección |
| Super Admin | `GET/POST /api/superadmin/colegios`, `PATCH /{id}/estado` | Solo SUPER_ADMIN |

## Integración del lector RFID/QR

El dispositivo envía una petición por cada pasada de tarjeta:

```
POST http://<servidor>:8080/api/asistencia/lectura
Content-Type: application/json
X-Api-Key: <credencial del lector>

{ "tarjeta": "RF-88213" }
```

La credencial se obtiene al registrar el lector en **Configuración → Lectores**
(se muestra una sola vez). El sistema resuelve el estudiante, determina si es
entrada o salida, clasifica la puntualidad según `HORA_TOLERANCIA`, difunde la
lectura al monitor en vivo y notifica a los apoderados.

Para probar sin hardware: **Control en vivo → Simular lectura**. En el perfil
`dev` la credencial del lector precargado es `lector-demo-key`.

## Estructura

```
src/main/java/com/willay
├── config/        CORS, OpenAPI, async
├── controller/    Endpoints REST
├── dto/           Records de entrada/salida con validación
├── entity/        JPA (27 entidades, base con uuid para sync futura)
├── repository/    Spring Data
├── service/       Lógica de negocio
├── mapper/        MapStruct
├── security/      JWT + filtro + UserDetails
├── validation/    Validadores propios (@Dni)
├── exception/     Manejo global de errores
├── util/          CurrentUser (colegioId SIEMPRE del token)
└── audit/         Auditoría asíncrona
resources/db/migration   Migraciones Flyway (V1 esquema, V2 semilla)
```

## Decisiones clave

- **Multi-tenant por columna**: toda tabla lleva `colegio_id`; el valor sale del JWT.
- **Local-first preparado**: cada tabla de negocio tiene `uuid` global y `actualizado_en`,
  la base necesaria para sincronizar con un servidor central en el futuro. No hay sync aún.
- **Flyway manda**: JPA está en `validate`; el esquema solo cambia por migraciones.
- **Refresh token rotativo**: cada uso revoca el anterior; logout revoca todos.
