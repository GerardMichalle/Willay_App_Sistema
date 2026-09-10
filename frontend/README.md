# Willay · Sistema de Gestión Escolar

Frontend en React + TypeScript + Vite + Tailwind CSS v4.
Asistencia RFID en tiempo real, gestión académica y comunicación con familias.

## Ejecutar en tu máquina

```bash
npm install
npm run dev      # abre http://localhost:5173
```

Requiere el backend Spring Boot corriendo en `:8080` (`docker compose up` en
`backend/`) para iniciar sesión y cargar datos reales.

## Estructura

- `src/services/api.ts` — ÚNICA capa de datos: habla directo con el backend
  Spring Boot. Ninguna pantalla hace `fetch` por su cuenta.
- `src/components/ui.tsx` — design system (cards, badges, tablas, avatares).
- `src/index.css` — tokens de color y tipografía (@theme de Tailwind v4).
- `src/pages/**` — un archivo por módulo.

## Integración con el backend (Spring Boot)

- Proxy configurado en `vite.config.ts`: `/api` y `/actuator` → `http://localhost:8080`.
- Lector físico → `POST /api/asistencia/lectura` → SSE `/api/asistencia/stream`
  → GateTicker y Control en vivo.
- Login → `POST /api/auth/login` (JWT).

## Roles (v1)

- **Administrador**: acceso total — usuarios, roles, configuración, cursos gratuitos (sube PDFs/videos/libros/imágenes), control en vivo, reportes.
- **Dirección**: supervisa todo (registros, vínculos padre-alumno, asistencia en vivo, reportes, comunicados) pero NO configura el sistema ni roles.
- **Docente**: solo su aula asignada — asistencia en vivo filtrada, conducta, notas y libretas, comunicados.
- **Estudiante**: portal propio con Mi Perfil (foto, QR/tarjeta RFID, racha), notas, asistencia, cursos gratuitos.
- **Padre**: todo sobre su hijo en una vista — ingreso/salida en tiempo real con fecha y hora, libreta, conducta, comunicados, cursos.

## Nota de alcance v1

Sin Finanzas, Horarios, Evaluaciones, Biblioteca ni Inventario (fuera del alcance inicial).
Cursos gratuitos incluye "Economía y Finanzas", estructura lista para más cursos.
