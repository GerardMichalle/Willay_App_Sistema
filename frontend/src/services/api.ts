/**
 * Capa de servicios de Willay: única capa de datos del frontend.
 * Cada función habla directamente con el backend Spring Boot
 * (proxy de Vite: /api → http://localhost:8080).
 */
import type {
  Rol, Usuario, Alumno, Aula, DocenteApi, ApoderadoApi,
  ColegioApi, SetupEstado, Importacion, MatriculaResultado,
  LecturaVivo, NotificacionApi, ComunicadoApi, ConductaApi,
  LibretaApi, CursoApi, UsuarioAdminApi, PuntoAccesoApi,
  TarjetaSinAsignarEvento,
} from '../types';

// ── Conexión real con el backend (Spring Boot en :8080, proxy de Vite) ──
const CLAVE_SESION = 'willay-sesion';

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

async function http<T>(ruta: string, body?: unknown, conAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (conAuth) {
    const token = tokenActual();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(ruta, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend? (docker compose up)');
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

/** Igual que http() pero con verbo explícito (PUT, DELETE, PATCH). */
async function httpMetodo<T>(metodo: string, ruta: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(ruta, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  if (!res.ok) {
    let mensaje = 'Ocurrió un error inesperado';
    try {
      const err = await res.json();
      mensaje = err?.mensaje ?? mensaje;
      if (err?.detalles) mensaje = Object.values(err.detalles as Record<string, string>)[0] ?? mensaje;
    } catch { /* sin cuerpo */ }
    throw new Error(mensaje);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** El backend habla en MAYÚSCULAS; el frontend usa sus propios ids de rol. */
const ROL_BACKEND_A_FRONT: Record<string, Rol> = {
  SUPER_ADMIN: 'superadmin', ADMIN: 'admin', DIRECCION: 'direccion',
  DOCENTE: 'profesor', ALUMNO: 'alumno', APODERADO: 'apoderado',
};

interface UsuarioApi {
  id: number; nombres: string; apellidos: string; correo: string;
  rol: string; fotoUrl: string | null; colegioId: number; colegioNombre: string;
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
    // TODO Spring Boot (/api/auth/yo enriquecido): aula y vínculos reales.
    // Mientras tanto, valores del entorno demo para los filtros de pantalla:
    aula: rol === 'profesor' ? '5° A' : undefined,
    codigoAlumno: rol === 'alumno' ? 'A-2041' : undefined,
    hijoCodigo: rol === 'apoderado' ? 'A-2041' : undefined,
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
  estadoHoy: string;
}

interface PaginaApi<T> {
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
  };
}

export interface OpcionesGetAlumnos {
  /** Acota a una sola aula (usado por "Vincular tarjetas" para achicar la búsqueda). */
  aulaId?: number;
  /** Solo estudiantes sin tarjeta activa (idem). */
  sinTarjeta?: boolean;
}

/** GET /api/alumnos — el backend filtra por colegio y por el alcance del rol. */
export async function getAlumnos(q?: string, opciones?: OpcionesGetAlumnos): Promise<Alumno[]> {
  const params = new URLSearchParams({ tamano: '200' });
  if (q) params.set('q', q);
  if (opciones?.aulaId) params.set('aulaId', String(opciones.aulaId));
  if (opciones?.sinTarjeta) params.set('sinTarjeta', 'true');
  const r = await http<PaginaApi<AlumnoApi>>(`/api/alumnos?${params}`, undefined, true);
  return r.contenido.map(mapearAlumno);
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

export async function getDocentes(): Promise<DocenteApi[]> {
  return http<DocenteApi[]>('/api/docentes', undefined, true);
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
export async function getApoderados(): Promise<ApoderadoApi[]> {
  return http<ApoderadoApi[]>('/api/apoderados', undefined, true);
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
async function subirArchivo<T>(ruta: string, archivo: File): Promise<T> {
  const form = new FormData();
  form.append('archivo', archivo);
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(ruta, { method: 'POST', headers, body: form });
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

/** Descarga la plantilla Excel con el token de sesión. */
export async function descargarPlantilla(): Promise<void> {
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('/api/matriculas/plantilla', { headers });
  if (!res.ok) throw new Error('No se pudo descargar la plantilla');

  const blob = await res.blob();
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
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api/credenciales/alumno/${alumnoId}/qr`, { headers });
  if (!res.ok) throw new Error('No se pudo generar el código QR');
  return URL.createObjectURL(await res.blob());
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

/* ═══════════════════════════════════════════════════════════════════
   Asistencia en tiempo real, comunicación y evaluación
   ═══════════════════════════════════════════════════════════════════ */

// ── Asistencia ──────────────────────────────────────────────────────
export async function getLecturasVivo(): Promise<LecturaVivo[]> {
  return http<LecturaVivo[]>('/api/asistencia/hoy', undefined, true);
}

/**
 * Canal de lecturas en vivo (SSE). El navegador no puede enviar cabeceras
 * en EventSource, por eso el token viaja como parámetro: el backend lo
 * acepta únicamente en esta ruta.
 */
export function abrirCanalAsistencia(
  alRecibir: (l: LecturaVivo) => void,
  alFallar?: () => void,
): () => void {
  const token = tokenActual();
  if (!token) return () => {};

  const fuente = new EventSource(`/api/asistencia/stream?token=${encodeURIComponent(token)}`);
  fuente.addEventListener('lectura', e => {
    try { alRecibir(JSON.parse((e as MessageEvent).data) as LecturaVivo); } catch { /* dato inválido */ }
  });
  fuente.onerror = () => { alFallar?.(); };
  return () => fuente.close();
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
  const token = tokenActual();
  if (!token) return () => {};

  const fuente = new EventSource(`/api/asistencia/stream/vincular?token=${encodeURIComponent(token)}`);
  fuente.addEventListener('tarjeta_sin_asignar', e => {
    try { alRecibir(JSON.parse((e as MessageEvent).data) as TarjetaSinAsignarEvento); } catch { /* dato inválido */ }
  });
  fuente.onerror = () => { alFallar?.(); };
  return () => fuente.close();
}

/** Simula una pasada de tarjeta. Útil para probar sin el lector físico. */
export async function simularLectura(tarjeta: string, apiKey: string): Promise<LecturaVivo> {
  const res = await fetch('/api/asistencia/lectura', {
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
export async function getNotificaciones(): Promise<NotificacionApi[]> {
  return http<NotificacionApi[]>('/api/notificaciones', undefined, true);
}

export async function getNoLeidas(): Promise<number> {
  const r = await http<{ total: number }>('/api/notificaciones/sin-leer', undefined, true);
  return r.total;
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

export async function getConductaApi(): Promise<ConductaApi[]> {
  return http<ConductaApi[]>('/api/conducta', undefined, true);
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

export async function getUsuariosAdmin(): Promise<UsuarioAdminApi[]> {
  return http<UsuarioAdminApi[]>('/api/usuarios', undefined, true);
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
  const headers: Record<string, string> = {};
  const token = tokenActual();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(ruta, { headers });
  if (!res.ok) throw new Error('No se pudo generar el archivo');
  const url = URL.createObjectURL(await res.blob());
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
