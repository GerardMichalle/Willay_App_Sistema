/**
 * Capa de servicios de Willay: única capa de datos del frontend.
 * Cada función habla directamente con el backend Spring Boot
 * (proxy de Vite: /api → http://localhost:8080).
 */
import { Capacitor } from '@capacitor/core';
import type {
  Rol, Usuario, Alumno, Aula, DocenteApi, ApoderadoApi,
  ColegioApi, ChecklistColegioApi, MetricasColegioApi, AuditoriaGlobalApi, NotaInternaApi, ComunicadoGlobalApi, SetupEstado, Importacion, MatriculaResultado,
  LecturaVivo, NotificacionApi, ComunicadoApi, ConductaApi,
  LibretaApi, CursoApi, UsuarioAdminApi, PuntoAccesoApi,
  TarjetaSinAsignarEvento, AsistenciaHistorialApi,
} from '../types';

// ── Conexión real con el backend (Spring Boot en :8080, proxy de Vite) ──
const CLAVE_SESION = 'willay-sesion';

/**
 * En web las rutas quedan relativas a propósito: el proxy de Vite (dev) y el
 * rewrite de vercel.json (producción) las resuelven contra el backend. La
 * app nativa (Capacitor) no pasa por ninguno de los dos — el WebView sirve
 * el build empaquetado desde su propio origen — así que ahí sí hace falta
 * apuntar directo al backend real.
 */
const ORIGEN_API = Capacitor.isNativePlatform() ? 'https://api.willay.app' : '';
function url(ruta: string): string { return `${ORIGEN_API}${ruta}`; }

interface Sesion {
  accessToken: string;
  refreshToken: string;
  usuario: Usuario;
}

export function sesionGuardada(): Sesion | null {
  try {
    const raw = localStorage.getItem(CLAVE_SESION);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch { return null; }
}

function guardarSesion(s: Sesion) { localStorage.setItem(CLAVE_SESION, JSON.stringify(s)); }
export function borrarSesion() { localStorage.removeItem(CLAVE_SESION); }
export function tokenActual(): string | null { return sesionGuardada()?.accessToken ?? null; }

/** Lo lee Login.tsx al montar para avisar, con el Toast, por qué volvió aquí. */
export const CLAVE_AVISO_SESION_EXPIRADA = 'willay-sesion-expirada';

/**
 * Sesión realmente muerta (el refresh token también expiró o no hay sesión
 * guardada): limpia todo y manda al login con un aviso. Un reload completo
 * es lo más simple para que AuthContext (y todo el estado en memoria) vuelva
 * a nacer limpio, sin necesitar un canal de eventos aparte para notificarle.
 */
function manejarSesionExpirada() {
  borrarSesion();
  sessionStorage.setItem(CLAVE_AVISO_SESION_EXPIRADA, '1');
  window.location.href = '/login';
}

/**
 * 'ok': se renovó. 'rechazada': el backend dijo que no (refresh también
 * vencido o inválido) — la sesión ya expiró de verdad. 'sin-red': ni
 * siquiera se pudo intentar (sin conexión) — distinto de 'rechazada' porque
 * no implica que la sesión haya muerto, solo que ahora mismo no se puede
 * confirmar; quien llama no debe cerrar sesión por esto, solo reintentar.
 */
type ResultadoRenovacion = 'ok' | 'rechazada' | 'sin-red';

let renovacionEnCurso: Promise<ResultadoRenovacion> | null = null;

async function renovarToken(): Promise<ResultadoRenovacion> {
  const actual = sesionGuardada();
  if (!actual) return 'rechazada';
  let res: Response;
  try {
    res = await fetch(url('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: actual.refreshToken }),
    });
  } catch {
    return 'sin-red';
  }
  if (!res.ok) return 'rechazada';
  const r = await res.json() as { accessToken: string; refreshToken: string; usuario: UsuarioApi };
  guardarSesion({ accessToken: r.accessToken, refreshToken: r.refreshToken, usuario: mapearUsuario(r.usuario) });
  return 'ok';
}

/** Comparte una sola renovación en curso entre todas las peticiones que reciban 401 al mismo tiempo. */
function renovarTokenCompartido(): Promise<ResultadoRenovacion> {
  if (!renovacionEnCurso) {
    renovacionEnCurso = renovarToken().finally(() => { renovacionEnCurso = null; });
  }
  return renovacionEnCurso;
}

/**
 * Aplica cambios al usuario de la sesión activa (p. ej. tras subir una foto)
 * sin volver a loguearse. Devuelve el usuario actualizado para setearlo en
 * el estado de React, o null si no hay sesión.
 */
export function actualizarUsuarioSesion(cambios: Partial<Usuario>): Usuario | null {
  const s = sesionGuardada();
  if (!s) return null;
  const usuario = { ...s.usuario, ...cambios };
  guardarSesion({ ...s, usuario });
  return usuario;
}

/**
 * Núcleo compartido de http()/httpMetodo(). Si una petición autenticada
 * recibe 401, intenta renovar la sesión una sola vez (compartiendo la
 * renovación con cualquier otra petición que haya fallado al mismo tiempo)
 * y reintenta automáticamente — el usuario no debe notar que el access
 * token de 30 min expiró. Si la renovación falla (o el reintento vuelve a
 * dar 401), la sesión ya expiró de verdad: manejarSesionExpirada() se
 * encarga y esta promesa deliberadamente no resuelve más, porque la página
 * está a punto de navegar a /login.
 */
async function peticion<T>(metodo: string, ruta: string, body: unknown, conAuth: boolean, reintento = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conAuth) {
    const token = tokenActual();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(url(ruta), { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend? (docker compose up)');
  }

  if (res.status === 401 && conAuth) {
    if (!reintento) {
      const resultado = await renovarTokenCompartido();
      if (resultado === 'ok') return peticion<T>(metodo, ruta, body, conAuth, true);
      if (resultado === 'sin-red') {
        throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend? (docker compose up)');
      }
    }
    manejarSesionExpirada();
    return new Promise<T>(() => {});
  }

  if (!res.ok) {
    let mensaje = 'Ocurrió un error inesperado';
    try {
      const err = await res.json();
      mensaje = err?.mensaje ?? mensaje;
      if (err?.detalles) mensaje = Object.values(err.detalles as Record<string, string>)[0] ?? mensaje;
    } catch { /* respuesta sin cuerpo */ }
    throw new Error(mensaje);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function http<T>(ruta: string, body?: unknown, conAuth = false): Promise<T> {
  return peticion<T>(body === undefined ? 'GET' : 'POST', ruta, body, conAuth);
}

/** Igual que http() pero con verbo explícito (PUT, DELETE, PATCH). Siempre autenticada. */
async function httpMetodo<T>(metodo: string, ruta: string, body?: unknown): Promise<T> {
  return peticion<T>(metodo, ruta, body, true);
}

/** El backend habla en MAYÚSCULAS; el frontend usa sus propios ids de rol. */
const ROL_BACKEND_A_FRONT: Record<string, Rol> = {
  SUPER_ADMIN: 'superadmin', ADMIN: 'admin', DIRECCION: 'direccion',
  DOCENTE: 'profesor', ALUMNO: 'alumno', APODERADO: 'apoderado',
};

interface UsuarioApi {
  id: number; nombres: string; apellidos: string; correo: string;
  rol: string; fotoUrl: string | null; colegioId: number; colegioNombre: string;
  colegioLogoUrl: string | null;
}

function mapearUsuario(u: UsuarioApi): Usuario {
  const rol = ROL_BACKEND_A_FRONT[u.rol] ?? 'alumno';
  const nombre = `${u.nombres} ${u.apellidos}`;
  return {
    id: String(u.id),
    nombre,
    correo: u.correo,
    rol,
    colegio: u.colegioNombre,
    sede: 'Sede Central',
    iniciales: (u.nombres[0] ?? '') + (u.apellidos[0] ?? ''),
    fotoUrl: u.fotoUrl,
    colegioLogoUrl: u.colegioLogoUrl,
  };
}

// POST /api/auth/login — autenticación REAL contra la base de datos
export async function login(correo: string, password: string): Promise<Usuario> {
  const r = await http<{ accessToken: string; refreshToken: string; usuario: UsuarioApi }>(
    '/api/auth/login', { correo, password });
  const usuario = mapearUsuario(r.usuario);
  guardarSesion({ accessToken: r.accessToken, refreshToken: r.refreshToken, usuario });
  return usuario;
}

// POST /api/auth/logout — revoca los refresh tokens en el servidor
export async function logout(): Promise<void> {
  try { await http<void>('/api/auth/logout', {}, true); } catch { /* la sesión local se borra igual */ }
  borrarSesion();
}

// PUT /api/auth/password — cambio de contraseña del usuario autenticado
export async function cambiarPasswordPropia(passwordActual: string, passwordNueva: string): Promise<void> {
  await httpMetodo<void>('PUT', '/api/auth/password', { passwordActual, passwordNueva });
}

// ── Recuperar contraseña (sin sesión) ──
export async function solicitarRecuperacion(correo: string): Promise<void> {
  await http<void>('/api/auth/recuperar/solicitar', { correo });
}

export async function completarRecuperacion(correo: string, codigo: string, passwordNueva: string): Promise<void> {
  await http<void>('/api/auth/recuperar/completar', { correo, codigo, passwordNueva });
}

// ── Notificaciones push del navegador (Web Push / VAPID) ──
export async function getClavePublicaPush(): Promise<string> {
  const r = await http<{ clavePublica: string }>('/api/push/clave-publica', undefined, true);
  return r.clavePublica;
}

export async function suscribirPush(suscripcion: PushSubscriptionJSON): Promise<void> {
  await http<void>('/api/push/suscribir', suscripcion, true);
}

export async function desuscribirPush(endpoint: string): Promise<void> {
  await httpMetodo<void>('DELETE', '/api/push/suscribir', { endpoint });
}

// ── Notificaciones push nativas de la app Android (Firebase Cloud Messaging) ──
export async function registrarTokenFcm(token: string): Promise<void> {
  await http<void>('/api/push/fcm', { token }, true);
}

export async function eliminarTokenFcm(token: string): Promise<void> {
  await httpMetodo<void>('DELETE', '/api/push/fcm', { token });
}

// ── Activación de cuenta (flujo real de 2 pasos) ──
export interface IdentidadActivacion { nombreCompleto: string; rol: string; vinculo: string }

export async function verificarActivacion(codigo: string, dni: string): Promise<IdentidadActivacion> {
  return http<IdentidadActivacion>('/api/activacion/verificar', { codigo, dni });
}

export async function completarActivacion(codigo: string, dni: string, password: string): Promise<IdentidadActivacion> {
  return http<IdentidadActivacion>('/api/activacion/completar', { codigo, dni, password });
}

// ── Alumnos ─────────────────────────────────────────────────────────
interface AlumnoApi {
  id: number; codigo: string; nombres: string; apellidos: string;
  dni: string | null; fechaNacimiento: string | null; fotoUrl: string | null;
  estado: string; aulaId: number | null; grado: string | null; seccion: string | null;
  nivel: string | null; tarjetaRfid: string | null; apoderado: string | null;
  telefonoApoderado: string | null; entradaHoy: string | null; salidaHoy: string | null;
  estadoHoy: string; estadoCuenta: string | null;
}

export interface PaginaApi<T> {
  contenido: T[]; pagina: number; tamano: number; total: number; totalPaginas: number;
}

const ESTADO_ASISTENCIA: Record<string, Alumno['estadoHoy']> = {
  PUNTUAL: 'puntual', TARDANZA: 'tardanza', AUSENTE: 'ausente',
  JUSTIFICADO: 'ausente', SIN_REGISTRO: 'ausente',
};

function mapearAlumno(a: AlumnoApi): Alumno {
  return {
    id: String(a.id),
    codigo: a.codigo,
    nombres: a.nombres,
    apellidos: a.apellidos,
    grado: a.grado ?? '',
    seccion: a.seccion ?? '',
    tarjetaRfid: a.tarjetaRfid,
    apoderado: a.apoderado ?? 'Sin apoderado vinculado',
    telefonoApoderado: a.telefonoApoderado ?? '—',
    entradaHoy: a.entradaHoy,
    salidaHoy: a.salidaHoy,
    estadoHoy: ESTADO_ASISTENCIA[a.estadoHoy] ?? 'ausente',
    fechaNacimiento: a.fechaNacimiento ?? '',
    dni: a.dni,
    aulaId: a.aulaId,
    estado: a.estado,
    fotoUrl: a.fotoUrl,
    estadoCuenta: a.estadoCuenta,
  };
}

export interface OpcionesGetAlumnos {
  /** Acota a una sola aula (usado por "Vincular tarjetas" para achicar la búsqueda). */
  aulaId?: number;
  /** Solo estudiantes sin tarjeta activa (idem). */
  sinTarjeta?: boolean;
}

/**
 * GET /api/alumnos — el backend filtra por colegio y por el alcance del rol.
 * Para selectores/buscadores que necesitan "todos los que calcen" en una
 * sola llamada (Matrículas, Conducta, Vincular tarjetas, cumpleaños del
 * dashboard) — no para la tabla principal de Alumnos, que usa
 * getAlumnosPagina() con paginación real visible.
 */
export async function getAlumnos(q?: string, opciones?: OpcionesGetAlumnos): Promise<Alumno[]> {
  const r = await getAlumnosPagina(q, { ...opciones, tamano: 200 });
  return r.contenido;
}

/** Igual que getAlumnos(), pero con paginación real: usada por la tabla de Alumnos.tsx. */
export async function getAlumnosPagina(
  q?: string, opciones?: OpcionesGetAlumnos & { pagina?: number; tamano?: number },
): Promise<PaginaApi<Alumno>> {
  const params = new URLSearchParams({
    pagina: String(opciones?.pagina ?? 0),
    tamano: String(opciones?.tamano ?? 50),
  });
  if (q) params.set('q', q);
  if (opciones?.aulaId) params.set('aulaId', String(opciones.aulaId));
  if (opciones?.sinTarjeta) params.set('sinTarjeta', 'true');
  const r = await http<PaginaApi<AlumnoApi>>(`/api/alumnos?${params}`, undefined, true);
  return { ...r, contenido: r.contenido.map(mapearAlumno) };
}

export interface DatosAlumno {
  nombres: string;
  apellidos: string;
  dni?: string | null;
  fechaNacimiento?: string | null;
  aulaId: number;
  tarjetaRfid?: string | null;
}

// POST /api/alumnos — el código A-XXXX lo genera el backend
export async function crearAlumno(datos: DatosAlumno): Promise<Alumno> {
  const r = await http<AlumnoApi>('/api/alumnos', datos, true);
  return mapearAlumno(r);
}

// PUT /api/alumnos/{id}
export async function actualizarAlumno(id: string, datos: DatosAlumno): Promise<Alumno> {
  const r = await httpMetodo<AlumnoApi>('PUT', `/api/alumnos/${id}`, datos);
  return mapearAlumno(r);
}

/** DELETE /api/alumnos/{id} — baja lógica: conserva su historial. */
export async function retirarAlumno(id: string): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/alumnos/${id}`);
}

/** POST /api/alumnos/{id}/tarjeta — vinculación rápida desde "Vincular tarjetas". */
export async function vincularTarjetaAlumno(id: string, uid: string): Promise<Alumno> {
  const r = await http<AlumnoApi>(`/api/alumnos/${id}/tarjeta`, { uid }, true);
  return mapearAlumno(r);
}

/**
 * POST /api/alumnos/{id}/cuenta — crea la cuenta web de un estudiante ya
 * matriculado que no la tiene. dni solo hace falta si aún no lo tiene.
 */
export async function crearCuentaAlumno(id: string, correo: string, dni?: string | null): Promise<{ codigoActivacion: string }> {
  return http<{ codigoActivacion: string }>(`/api/alumnos/${id}/cuenta`, { correo, dni: dni || null }, true);
}

// ── Aulas ───────────────────────────────────────────────────────────
export async function getAulas(): Promise<Aula[]> {
  return http<Aula[]>('/api/aulas', undefined, true);
}

// ── Dashboard ───────────────────────────────────────────────────────
export interface EntradasDia { fecha: string; diaCorto: string; entradas: number }

export interface DashboardStats {
  presentes: number;
  totalAlumnos: number;
  tardanzas: number;
  ausentes: number;
  docentesActivos: number;
  docentesTotal: number;
  apoderadosConCuenta: number;
  apoderadosTotal: number;
  lectoresEnLinea: number;
  lectoresTotal: number;
  comunicadosPublicados: number;
  semana: EntradasDia[];
}

/** GET /api/dashboard/stats — conteos reales de la base de datos.
 *  Una instalación nueva devuelve ceros legítimos. */
export async function getStatsHoy(): Promise<DashboardStats> {
  return http<DashboardStats>('/api/dashboard/stats', undefined, true);
}

// ── Cursos gratuitos (catálogo global del proveedor) ────────────────
export interface RecursoApi {
  id: number; titulo: string; tipo: string; urlArchivo: string | null;
  tamano: string | null; duracion: string | null; orden: number;
}

export interface CategoriaApi {
  id: number; nombre: string; orden: number; recursos: RecursoApi[];
}

export interface CursoApiCatalogo {
  id: number; titulo: string; descripcion: string | null; portadaUrl: string | null;
  global: boolean; orden: number; inscritos: number; categorias: CategoriaApi[];
}

export async function getCursosGratuitos(): Promise<CursoApiCatalogo[]> {
  return http<CursoApiCatalogo[]>('/api/cursos-gratuitos', undefined, true);
}

export interface DatosCurso { titulo: string; descripcion?: string | null; portadaUrl?: string | null; orden: number }
export interface DatosCategoria { nombre: string; orden: number }
export interface DatosRecurso {
  titulo: string; tipo: string; urlArchivo?: string | null;
  tamanoBytes?: number | null; duracionSeg?: number | null; orden: number;
}

export async function crearCurso(d: DatosCurso) {
  return http<CursoApiCatalogo>('/api/cursos-gratuitos', d, true);
}
export async function actualizarCurso(id: number, d: DatosCurso) {
  return httpMetodo<CursoApiCatalogo>('PUT', `/api/cursos-gratuitos/${id}`, d);
}
export async function eliminarCurso(id: number) {
  await httpMetodo<void>('DELETE', `/api/cursos-gratuitos/${id}`);
}
export async function crearCategoriaCurso(cursoId: number, d: DatosCategoria) {
  return http<CursoApiCatalogo>(`/api/cursos-gratuitos/${cursoId}/categorias`, d, true);
}
export async function actualizarCategoriaCurso(cursoId: number, categoriaId: number, d: DatosCategoria) {
  return httpMetodo<CursoApiCatalogo>('PUT', `/api/cursos-gratuitos/${cursoId}/categorias/${categoriaId}`, d);
}
export async function eliminarCategoriaCurso(cursoId: number, categoriaId: number) {
  await httpMetodo<void>('DELETE', `/api/cursos-gratuitos/${cursoId}/categorias/${categoriaId}`);
}
export async function agregarRecursoCurso(cursoId: number, categoriaId: number, d: DatosRecurso) {
  return http<CursoApiCatalogo>(`/api/cursos-gratuitos/${cursoId}/categorias/${categoriaId}/recursos`, d, true);
}
export async function eliminarRecursoCurso(cursoId: number, recursoId: number) {
  await httpMetodo<void>('DELETE', `/api/cursos-gratuitos/${cursoId}/recursos/${recursoId}`);
}

/* ═══════════════════════════════════════════════════════════════════
   Módulos de gestión — todos contra el backend real
   ═══════════════════════════════════════════════════════════════════ */

// ── Aulas (CRUD) ────────────────────────────────────────────────────
export interface DatosAula {
  nivel: string;
  grado: string;
  seccion: string;
  anioEscolar: number;
  sedeId?: number | null;
}

export async function crearAula(datos: DatosAula): Promise<Aula> {
  return http<Aula>('/api/aulas', datos, true);
}

export async function actualizarAula(id: number, datos: DatosAula): Promise<Aula> {
  return httpMetodo<Aula>('PUT', `/api/aulas/${id}`, datos);
}

export async function desactivarAula(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/aulas/${id}`);
}

// ── Docentes (CRUD) ─────────────────────────────────────────────────
export interface DatosDocente {
  nombres: string;
  apellidos: string;
  correo: string;
  dni?: string | null;
  telefono?: string | null;
  especialidad?: string | null;
  aulaIds: number[];
  aulaTutoriaId?: number | null;
}

export async function getDocentes(opciones?: { pagina?: number; tamano?: number }): Promise<PaginaApi<DocenteApi>> {
  const params = new URLSearchParams({
    pagina: String(opciones?.pagina ?? 0),
    tamano: String(opciones?.tamano ?? 50),
  });
  return http<PaginaApi<DocenteApi>>(`/api/docentes?${params}`, undefined, true);
}

export async function crearDocente(datos: DatosDocente): Promise<DocenteApi> {
  return http<DocenteApi>('/api/docentes', datos, true);
}

export async function actualizarDocente(id: number, datos: DatosDocente): Promise<DocenteApi> {
  return httpMetodo<DocenteApi>('PUT', `/api/docentes/${id}`, datos);
}

export async function cesarDocente(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/docentes/${id}`);
}

// ── Apoderados ──────────────────────────────────────────────────────
export async function getApoderados(opciones?: { pagina?: number; tamano?: number }): Promise<PaginaApi<ApoderadoApi>> {
  const params = new URLSearchParams({
    pagina: String(opciones?.pagina ?? 0),
    tamano: String(opciones?.tamano ?? 50),
  });
  return http<PaginaApi<ApoderadoApi>>(`/api/apoderados?${params}`, undefined, true);
}

export async function crearCuentaApoderado(id: number, correo: string): Promise<{ codigoActivacion: string }> {
  return http<{ codigoActivacion: string }>(`/api/apoderados/${id}/cuenta`, { correo }, true);
}

export async function eliminarApoderado(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/apoderados/${id}`);
}

// ── Matrícula ───────────────────────────────────────────────────────
export interface DatosMatricula {
  alumno: {
    nombres: string; apellidos: string; dni?: string | null;
    fechaNacimiento?: string | null; aulaId: number;
    tarjetaRfid?: string | null; crearCuenta: boolean; correo?: string | null;
  };
  apoderado: {
    nombres: string; apellidos: string; dni: string;
    telefono?: string | null; correo?: string | null; parentesco?: string | null;
  };
}

export async function matricular(datos: DatosMatricula): Promise<MatriculaResultado> {
  return http<MatriculaResultado>('/api/matriculas', datos, true);
}

// ── Importación masiva ──────────────────────────────────────────────
async function subirArchivo<T>(ruta: string, archivo: File, reintento = false): Promise<T> {
  const form = new FormData();
  form.append('archivo', archivo);
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url(ruta), { method: 'POST', headers, body: form });

  if (res.status === 401) {
    if (!reintento) {
      const resultado = await renovarTokenCompartido();
      if (resultado === 'ok') return subirArchivo<T>(ruta, archivo, true);
      if (resultado === 'sin-red') throw new Error('No se pudo conectar con el servidor');
    }
    manejarSesionExpirada();
    return new Promise<T>(() => {});
  }

  if (!res.ok) {
    let mensaje = 'No se pudo procesar el archivo';
    try { mensaje = (await res.json())?.mensaje ?? mensaje; } catch { /* sin cuerpo */ }
    throw new Error(mensaje);
  }
  return res.json() as Promise<T>;
}

export async function previsualizarImportacion(archivo: File): Promise<Importacion> {
  return subirArchivo<Importacion>('/api/matriculas/importar/previsualizar', archivo);
}

export async function confirmarImportacion(archivo: File): Promise<MatriculaResultado[]> {
  return subirArchivo<MatriculaResultado[]>('/api/matriculas/importar/confirmar', archivo);
}

/**
 * Núcleo compartido de toda descarga binaria autenticada (Excel, QR): mismo
 * mecanismo de renovación-y-reintento que peticion(), pero devolviendo un
 * Blob en vez de JSON.
 */
async function peticionBlob(ruta: string, mensajeError: string, reintento = false): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url(ruta), { headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend? (docker compose up)');
  }

  if (res.status === 401) {
    if (!reintento) {
      const resultado = await renovarTokenCompartido();
      if (resultado === 'ok') return peticionBlob(ruta, mensajeError, true);
      if (resultado === 'sin-red') throw new Error('No se pudo conectar con el servidor');
    }
    manejarSesionExpirada();
    return new Promise<Blob>(() => {});
  }

  if (!res.ok) throw new Error(mensajeError);
  return res.blob();
}

/** Descarga la plantilla Excel con el token de sesión. */
export async function descargarPlantilla(): Promise<void> {
  const blob = await peticionBlob('/api/matriculas/plantilla', 'No se pudo descargar la plantilla');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'willay-matriculas.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Credenciales ────────────────────────────────────────────────────
/** Devuelve el QR del alumno como URL de objeto lista para <img src>. */
export async function getQrAlumno(alumnoId: number | string): Promise<string> {
  const blob = await peticionBlob(`/api/credenciales/alumno/${alumnoId}/qr`, 'No se pudo generar el código QR');
  return URL.createObjectURL(blob);
}

// ── Configuración inicial ───────────────────────────────────────────
export async function getSetupEstado(): Promise<SetupEstado> {
  return http<SetupEstado>('/api/setup/estado', undefined, true);
}

// ── Super Admin (multi-colegio) ─────────────────────────────────────
export interface DatosColegio {
  nombre: string; codigoModular?: string | null; ruc?: string | null; colorMarca?: string | null;
  sedeNombre: string; sedeDireccion?: string | null;
  adminNombres: string; adminApellidos: string; adminCorreo: string;
  adminDni?: string | null; adminTelefono?: string | null; adminPasswordTemporal: string;
}

export async function getColegios(): Promise<ColegioApi[]> {
  return http<ColegioApi[]>('/api/superadmin/colegios', undefined, true);
}

export async function crearColegio(datos: DatosColegio): Promise<ColegioApi> {
  return http<ColegioApi>('/api/superadmin/colegios', datos, true);
}

export async function cambiarEstadoColegio(id: number, activo: boolean): Promise<ColegioApi> {
  return httpMetodo<ColegioApi>('PATCH', `/api/superadmin/colegios/${id}/estado?activo=${activo}`);
}

export async function enviarComunicadoGlobal(titulo: string, mensaje: string): Promise<void> {
  return http<void>('/api/superadmin/comunicado-global', { titulo, mensaje }, true);
}

export async function getComunicadosGlobales(): Promise<ComunicadoGlobalApi[]> {
  return http<ComunicadoGlobalApi[]>('/api/superadmin/comunicados-globales', undefined, true);
}

export async function actualizarPagoColegio(
  id: number, estadoPago: string, proximoVencimiento: string | null,
): Promise<ColegioApi> {
  return httpMetodo<ColegioApi>('PATCH', `/api/superadmin/colegios/${id}/pago`, { estadoPago, proximoVencimiento });
}

/** Sube o reemplaza el logo del colegio; devuelve el colegio ya actualizado, listo para refrescar la tarjeta. */
export async function subirLogoColegio(colegioId: number, archivo: File): Promise<ColegioApi> {
  return subirArchivo<ColegioApi>(`/api/superadmin/colegios/${colegioId}/logo`, archivo);
}

export async function getChecklistColegio(id: number): Promise<ChecklistColegioApi> {
  return http<ChecklistColegioApi>(`/api/superadmin/colegios/${id}/checklist`, undefined, true);
}

export async function getMetricasColegio(id: number): Promise<MetricasColegioApi> {
  return http<MetricasColegioApi>(`/api/superadmin/colegios/${id}/metricas`, undefined, true);
}

export async function getNotasColegio(id: number): Promise<NotaInternaApi[]> {
  return http<NotaInternaApi[]>(`/api/superadmin/colegios/${id}/notas`, undefined, true);
}

export async function crearNotaColegio(id: number, contenido: string): Promise<NotaInternaApi> {
  return http<NotaInternaApi>(`/api/superadmin/colegios/${id}/notas`, { contenido }, true);
}

export async function eliminarNotaColegio(id: number, notaId: number): Promise<void> {
  return httpMetodo<void>('DELETE', `/api/superadmin/colegios/${id}/notas/${notaId}`);
}

export async function getAuditoria(opciones: {
  colegioId?: number; accion?: string; pagina?: number; tamano?: number;
}): Promise<PaginaApi<AuditoriaGlobalApi>> {
  const params = new URLSearchParams({
    pagina: String(opciones.pagina ?? 0),
    tamano: String(opciones.tamano ?? 50),
  });
  if (opciones.colegioId) params.set('colegioId', String(opciones.colegioId));
  if (opciones.accion) params.set('accion', opciones.accion);
  return http<PaginaApi<AuditoriaGlobalApi>>(`/api/superadmin/auditoria?${params}`, undefined, true);
}

/** /actuator/health es público (ver SecurityConfig): no hace falta token para consultarlo. */
export async function getSaludSistema(): Promise<boolean> {
  const res = await fetch(url('/actuator/health'));
  if (!res.ok) return false;
  const cuerpo = await res.json();
  return cuerpo?.status === 'UP';
}

/* ═══════════════════════════════════════════════════════════════════
   Asistencia en tiempo real, comunicación y evaluación
   ═══════════════════════════════════════════════════════════════════ */

// ── Asistencia ──────────────────────────────────────────────────────
export async function getLecturasVivo(): Promise<LecturaVivo[]> {
  return http<LecturaVivo[]>('/api/asistencia/hoy', undefined, true);
}

/**
 * GET /api/asistencia/historial — historial real por rango, acotado al
 * alcance del rol. Para "Mi asistencia" (un solo alumno) una página amplia
 * alcanza de sobra; la tabla "Historial" de Admin/Dirección usa
 * getHistorialAsistenciaPagina() con paginación real visible.
 */
export async function getHistorialAsistencia(desde: string, hasta: string): Promise<AsistenciaHistorialApi[]> {
  const r = await getHistorialAsistenciaPagina(desde, hasta, { tamano: 200 });
  return r.contenido;
}

export async function getHistorialAsistenciaPagina(
  desde: string, hasta: string, opciones?: { pagina?: number; tamano?: number },
): Promise<PaginaApi<AsistenciaHistorialApi>> {
  const params = new URLSearchParams({
    desde, hasta,
    pagina: String(opciones?.pagina ?? 0),
    tamano: String(opciones?.tamano ?? 50),
  });
  return http<PaginaApi<AsistenciaHistorialApi>>(`/api/asistencia/historial?${params}`, undefined, true);
}

/**
 * Núcleo compartido de los canales SSE (asistencia en vivo, vinculación de
 * tarjetas). El navegador no puede enviar cabeceras en EventSource, por eso
 * el token viaja como parámetro en la URL — lo que significa que, a
 * diferencia de peticion(), el token queda "congelado" en la conexión: si
 * el canal lleva horas abierto (p. ej. "Control en vivo" toda la mañana) y
 * el access token expira, la reconexión nativa del navegador seguiría
 * reintentando para siempre con ese mismo token vencido.
 *
 * EventSource tampoco expone el código HTTP del error, así que no se puede
 * distinguir "token vencido" de "wifi caído" desde onerror. Por eso, ante
 * cualquier error: se cierra la conexión vieja y se intenta renovar la
 * sesión. Si renueva, se reabre con el token nuevo. Si la renovación fue
 * rechazada de verdad, la sesión expiró y se cierra sesión. Si fue solo
 * falta de red, NO se cierra sesión — se reintenta con el token actual tras
 * una pausa, igual que haría la reconexión nativa.
 */
function abrirCanalSSE<T>(
  ruta: string,
  nombreEvento: string,
  alRecibir: (dato: T) => void,
  alFallar?: () => void,
): () => void {
  const PAUSA_REINTENTO_MS = 3000;
  let fuente: EventSource | null = null;
  let cerrado = false;
  let reconectando = false;

  function conectar() {
    const token = tokenActual();
    if (!token || cerrado) return;

    fuente = new EventSource(`${url(ruta)}?token=${encodeURIComponent(token)}`);
    fuente.addEventListener(nombreEvento, e => {
      try { alRecibir(JSON.parse((e as MessageEvent).data) as T); } catch { /* dato inválido */ }
    });
    fuente.onerror = () => {
      alFallar?.();
      if (cerrado || reconectando) return;
      reconectando = true;
      fuente?.close();

      void renovarTokenCompartido().then(resultado => {
        reconectando = false;
        if (cerrado) return;
        if (resultado === 'rechazada') { manejarSesionExpirada(); return; }
        if (resultado === 'ok') { conectar(); return; }
        setTimeout(conectar, PAUSA_REINTENTO_MS);
      });
    };
  }

  conectar();
  return () => { cerrado = true; fuente?.close(); };
}

/** Canal de lecturas en vivo (SSE). */
export function abrirCanalAsistencia(
  alRecibir: (l: LecturaVivo) => void,
  alFallar?: () => void,
): () => void {
  return abrirCanalSSE<LecturaVivo>('/api/asistencia/stream', 'lectura', alRecibir, alFallar);
}

/**
 * Canal aparte, solo para la pantalla "Vincular tarjetas": mientras está
 * abierto, el backend difunde aquí cada tarjeta sin dueño que pasa por el
 * lector. Mismo patrón que abrirCanalAsistencia().
 */
export function abrirCanalVinculacion(
  alRecibir: (e: TarjetaSinAsignarEvento) => void,
  alFallar?: () => void,
): () => void {
  return abrirCanalSSE<TarjetaSinAsignarEvento>('/api/asistencia/stream/vincular', 'tarjeta_sin_asignar', alRecibir, alFallar);
}

/** Simula una pasada de tarjeta. Útil para probar sin el lector físico. */
export async function simularLectura(tarjeta: string, apiKey: string): Promise<LecturaVivo> {
  const res = await fetch(url('/api/asistencia/lectura'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify({ tarjeta }),
  });
  if (!res.ok) {
    let m = 'No se pudo registrar la lectura';
    try { m = (await res.json())?.mensaje ?? m; } catch { /* sin cuerpo */ }
    throw new Error(m);
  }
  return res.json() as Promise<LecturaVivo>;
}

// ── Notificaciones ──────────────────────────────────────────────────
/** tipos: uno o más tipos exactos (p. ej. ['COMUNICADO', 'AVISO_PLATAFORMA']); sin filtro si se omite. */
export async function getNotificaciones(tipos?: string[]): Promise<NotificacionApi[]> {
  const params = tipos && tipos.length > 0
    ? `?${tipos.map(t => `tipo=${encodeURIComponent(t)}`).join('&')}`
    : '';
  return http<NotificacionApi[]>(`/api/notificaciones${params}`, undefined, true);
}

export async function getNoLeidas(): Promise<number> {
  const r = await http<{ total: number }>('/api/notificaciones/sin-leer', undefined, true);
  return r.total;
}

export async function marcarNotificacionLeida(id: number): Promise<void> {
  await httpMetodo<void>('PATCH', `/api/notificaciones/${id}/leida`);
}

export async function marcarNotificacionesLeidas(): Promise<void> {
  await http<void>('/api/notificaciones/leer-todas', {}, true);
}

// ── Comunicados ─────────────────────────────────────────────────────
export interface DatosComunicado {
  titulo: string; cuerpo: string; dirigidoA: string;
  aulaId?: number | null; publicar: boolean;
}

export async function getComunicadosApi(): Promise<ComunicadoApi[]> {
  return http<ComunicadoApi[]>('/api/comunicados', undefined, true);
}

export async function crearComunicado(d: DatosComunicado): Promise<ComunicadoApi> {
  return http<ComunicadoApi>('/api/comunicados', d, true);
}

export async function actualizarComunicado(id: number, d: DatosComunicado): Promise<ComunicadoApi> {
  return httpMetodo<ComunicadoApi>('PUT', `/api/comunicados/${id}`, d);
}

export async function publicarComunicado(id: number): Promise<ComunicadoApi> {
  return http<ComunicadoApi>(`/api/comunicados/${id}/publicar`, {}, true);
}

export async function marcarComunicadoLeido(id: number): Promise<void> {
  await http<void>(`/api/comunicados/${id}/leido`, {}, true);
}

export async function eliminarComunicado(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/comunicados/${id}`);
}

// ── Conducta ────────────────────────────────────────────────────────
export interface DatosConducta {
  alumnoId: number; tipo: string; categoria: string;
  descripcion: string; fecha?: string | null;
}

/** Historial acotado (propio, de un hijo, o de una sola aula): alcanza con una sola página amplia. */
export async function getConductaApi(): Promise<ConductaApi[]> {
  const r = await getConductaPagina({ tamano: 200 });
  return r.contenido;
}

/** Tabla "Conducta" de Admin/Dirección/Docente, con paginación real y filtro de tipo opcional. */
export async function getConductaPagina(opciones: {
  tipo?: string; pagina?: number; tamano?: number;
}): Promise<PaginaApi<ConductaApi>> {
  const params = new URLSearchParams({
    pagina: String(opciones.pagina ?? 0),
    tamano: String(opciones.tamano ?? 50),
  });
  if (opciones.tipo) params.set('tipo', opciones.tipo);
  return http<PaginaApi<ConductaApi>>(`/api/conducta?${params}`, undefined, true);
}

export async function registrarConducta(d: DatosConducta): Promise<ConductaApi> {
  return http<ConductaApi>('/api/conducta', d, true);
}

export async function eliminarConducta(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/conducta/${id}`);
}

// ── Libretas y cursos ───────────────────────────────────────────────
export interface DatosLibreta {
  alumnoId: number; periodo: string; anioEscolar: number;
  observacion?: string | null;
  notas: { cursoId: number; calificacion: number; comentario?: string | null }[];
  publicar: boolean;
}

export async function getLibretas(alumnoId?: number): Promise<LibretaApi[]> {
  const q = alumnoId ? `?alumnoId=${alumnoId}` : '';
  return http<LibretaApi[]>(`/api/libretas${q}`, undefined, true);
}

export async function guardarLibreta(d: DatosLibreta): Promise<LibretaApi> {
  return http<LibretaApi>('/api/libretas', d, true);
}

export interface DatosLibretaEscaneada {
  alumnoId: number; periodo: string; anioEscolar: number; archivoUrl: string;
}

/** Publica la libreta como documento escaneado (foto o PDF de la libreta oficial). */
export async function subirLibretaEscaneada(d: DatosLibretaEscaneada): Promise<LibretaApi> {
  return http<LibretaApi>('/api/libretas/escaneada', d, true);
}

/** Aulas donde el docente autenticado es tutor: solo él puede publicar la libreta. */
export async function getAulasTutoria(): Promise<number[]> {
  return http<number[]>('/api/libretas/aulas-tutoria', undefined, true);
}

export async function getCursos(): Promise<CursoApi[]> {
  return http<CursoApi[]>('/api/cursos', undefined, true);
}

// ── Configuración y cuentas ─────────────────────────────────────────
export async function getConfiguracion(): Promise<Record<string, string>> {
  return http<Record<string, string>>('/api/configuracion', undefined, true);
}

export async function guardarConfiguracion(cambios: Record<string, string>): Promise<Record<string, string>> {
  return httpMetodo<Record<string, string>>('PUT', '/api/configuracion', cambios);
}

export async function getUsuariosAdmin(opciones?: {
  q?: string; estado?: string; pagina?: number; tamano?: number;
}): Promise<PaginaApi<UsuarioAdminApi>> {
  const params = new URLSearchParams({
    pagina: String(opciones?.pagina ?? 0),
    tamano: String(opciones?.tamano ?? 50),
  });
  if (opciones?.q) params.set('q', opciones.q);
  if (opciones?.estado) params.set('estado', opciones.estado);
  return http<PaginaApi<UsuarioAdminApi>>(`/api/usuarios?${params}`, undefined, true);
}

export async function cambiarEstadoUsuario(id: number, activo: boolean): Promise<UsuarioAdminApi> {
  return httpMetodo<UsuarioAdminApi>('PATCH', `/api/usuarios/${id}/estado?activo=${activo}`);
}

export async function reenviarCodigoUsuario(id: number): Promise<UsuarioAdminApi> {
  return http<UsuarioAdminApi>(`/api/usuarios/${id}/reenviar-codigo`, {}, true);
}

// ── Lectores ────────────────────────────────────────────────────────
export async function getPuntosAcceso(): Promise<PuntoAccesoApi[]> {
  return http<PuntoAccesoApi[]>('/api/puntos-acceso', undefined, true);
}

export async function crearPuntoAcceso(nombre: string): Promise<PuntoAccesoApi> {
  return http<PuntoAccesoApi>('/api/puntos-acceso', { nombre }, true);
}

export async function regenerarClaveLector(id: number): Promise<PuntoAccesoApi> {
  return http<PuntoAccesoApi>(`/api/puntos-acceso/${id}/regenerar-clave`, {}, true);
}

export async function desactivarPuntoAcceso(id: number): Promise<void> {
  await httpMetodo<void>('DELETE', `/api/puntos-acceso/${id}`);
}

// ── Archivos ────────────────────────────────────────────────────────
/**
 * Pide un enlace firmado de corta duración (5 min) para un archivo
 * protegido. Listo para usar directo como <a href> o <img src>: ya no
 * hace falta descargarlo manualmente con fetch + Authorization.
 */
export async function getEnlaceArchivo(uuid: string): Promise<string> {
  const r = await http<{ url: string }>(`/api/archivos/${uuid}/enlace`, undefined, true);
  return r.url;
}

/** Extrae el UUID de una ruta de archivo tipo "/api/archivos/{uuid}". */
export function uuidDeRutaArchivo(ruta: string): string {
  return ruta.split('/').pop() ?? ruta;
}

export async function subirFotoPerfil(archivo: File): Promise<string> {
  const r = await subirArchivo<{ url: string }>('/api/archivos/foto-perfil', archivo);
  return r.url;
}

export async function subirDocumento(archivo: File): Promise<string> {
  const r = await subirArchivo<{ url: string }>('/api/archivos/documento', archivo);
  return r.url;
}

// ── Exportación ─────────────────────────────────────────────────────
async function descargar(ruta: string, nombre: string): Promise<void> {
  const blob = await peticionBlob(ruta, 'No se pudo generar el archivo');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarAlumnos(): Promise<void> {
  await descargar('/api/exportar/alumnos', 'willay-alumnos.xlsx');
}

export async function exportarAsistencia(fecha?: string): Promise<void> {
  const q = fecha ? `?fecha=${fecha}` : '';
  await descargar(`/api/exportar/asistencia${q}`, `willay-asistencia-${fecha ?? 'hoy'}.xlsx`);
}
