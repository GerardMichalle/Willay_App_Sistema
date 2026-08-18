export type Rol = 'superadmin' | 'direccion' | 'admin' | 'profesor' | 'alumno' | 'apoderado';

export type EstadoAsistencia = 'puntual' | 'tardanza' | 'ausente' | 'justificado';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  colegio: string;
  sede: string;
  iniciales: string;
  /** Ruta cruda del archivo protegido ("/api/archivos/{uuid}"), no una URL directa. */
  fotoUrl?: string | null;
  /** Aula asignada (solo docentes). No poblado todavía: pendiente de enriquecer /api/auth/yo. */
  aula?: string;
}

export interface Alumno {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  grado: string;
  seccion: string;
  tarjetaRfid: string | null;
  apoderado: string;
  telefonoApoderado: string;
  entradaHoy: string | null;
  salidaHoy: string | null;
  estadoHoy: EstadoAsistencia;
  fechaNacimiento: string; // ISO
  /** Datos que llegan del backend (no existen en el modo demo) */
  dni?: string | null;
  aulaId?: number | null;
  estado?: string;
  fotoUrl?: string | null;
  /** null = el estudiante no tiene cuenta web; si no, ACTIVO/PENDIENTE/SUSPENDIDO. */
  estadoCuenta?: string | null;
}

export interface Aula {
  id: number;
  nivel: string;
  grado: string;
  seccion: string;
  anioEscolar: number;
  etiqueta: string;
  totalAlumnos: number;
}

export interface LecturaRfid {
  id: string;
  alumnoId: string;
  nombre: string;
  grado: string;
  tarjeta: string;
  hora: string;
  tipo: 'entrada' | 'salida';
  puerta: string;
  estado: EstadoAsistencia;
}

export interface Docente {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  cursos: string[];
  tutoria: string | null;
  estado: 'activo' | 'licencia';
}

export interface Apoderado {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  correo: string;
  hijos: string[]; // códigos de alumno
  registradoWeb: boolean;
}

export interface Curso {
  id: string;
  nombre: string;
  nivel: 'Inicial' | 'Primaria' | 'Secundaria';
  grado: string;
  docente: string;
  horasSemana: number;
}

export interface Evento {
  id: string;
  titulo: string;
  fecha: string; // ISO
  hora: string;
  lugar: string;
  tipo: 'academico' | 'civico' | 'deportivo' | 'reunion';
}

export interface Comunicado {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
  destinatarios: string;
  autor: string;
  leidoPor: number;
  totalDestinatarios: number;
}

export interface Actividad {
  id: string;
  texto: string;
  detalle: string;
  hora: string;
  tipo: 'entrada' | 'salida' | 'sistema' | 'comunicado' | 'matricula';
}

export interface Matricula {
  id: string;
  alumno: string;
  grado: string;
  fecha: string;
  estado: 'completa' | 'pendiente' | 'observada';
  apoderado: string;
}

export interface RegistroConducta {
  id: string;
  alumno: string;
  grado: string;
  tipo: 'merito' | 'demerito';
  categoria: string;
  descripcion: string;
  fecha: string;
  registradoPor: string;
}

export interface LibroBiblioteca {
  id: string;
  titulo: string;
  autor: string;
  codigo: string;
  categoria: string;
  disponibles: number;
  total: number;
}

export interface ItemInventario {
  id: string;
  nombre: string;
  codigo: string;
  categoria: string;
  ubicacion: string;
  cantidad: number;
  estado: 'operativo' | 'mantenimiento' | 'baja';
}

/* ── Cursos gratuitos ─────────────────────────────────────────────── */
export type TipoRecurso = 'pdf' | 'video' | 'libro' | 'imagen';

export interface RecursoCurso {
  id: string;
  titulo: string;
  tipo: TipoRecurso;
  tamano?: string;
  duracion?: string;
}

export interface CategoriaCurso {
  id: string;
  nombre: string;
  recursos: RecursoCurso[];
}

export interface CursoGratuito {
  id: string;
  titulo: string;
  descripcion: string;
  inscritos: number;
  categorias: CategoriaCurso[];
}

/* ── Entidades que llegan del backend ─────────────────────────────── */
export interface DocenteApi {
  id: number;
  usuarioId: number;
  nombres: string;
  apellidos: string;
  correo: string;
  dni: string | null;
  telefono: string | null;
  especialidad: string | null;
  estado: string;
  estadoCuenta: string;
  codigoActivacion: string | null;
  aulas: { id: number; etiqueta: string; esTutor: boolean }[];
}

export interface ApoderadoApi {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string | null;
  correo: string | null;
  estadoCuenta: string;
  codigoActivacion: string | null;
  hijos: { id: number; codigo: string; nombre: string; aula: string; parentesco: string }[];
}

export interface ColegioApi {
  id: number;
  nombre: string;
  codigoModular: string | null;
  ruc: string | null;
  colorMarca: string;
  activo: boolean;
  alumnos: number;
  docentes: number;
  apoderados: number;
  usuariosActivos: number;
  creadoEn: string;
}

export interface SetupEstado {
  colegioNombre: string;
  tieneLogo: boolean;
  aulas: number;
  docentes: number;
  alumnos: number;
  puntosAcceso: number;
  completo: boolean;
  porcentaje: number;
  siguientePaso: string;
}

export interface FilaImportacion {
  numeroFila: number;
  nombresAlumno: string;
  apellidosAlumno: string;
  dniAlumno: string;
  aula: string;
  nombresApoderado: string;
  apellidosApoderado: string;
  dniApoderado: string;
  telefonoApoderado: string;
  correoApoderado: string;
  tarjetaRfid: string;
  valida: boolean;
  errores: string[];
}

export interface Importacion {
  totalFilas: number;
  validas: number;
  conError: number;
  filas: FilaImportacion[];
}

export interface MatriculaResultado {
  alumnoId: number;
  codigoAlumno: string;
  nombreAlumno: string;
  aula: string;
  tarjetaRfid: string | null;
  apoderadoId: number;
  nombreApoderado: string;
  codigoActivacionApoderado: string | null;
  codigoActivacionAlumno: string | null;
}

/* ── Módulos conectados al backend ────────────────────────────────── */
export interface LecturaVivo {
  id: number; alumnoId: number; codigoAlumno: string; nombre: string;
  grado: string; tarjeta: string; metodo: string; tipo: string;
  hora: string; estado: string; puntoAcceso: string; fotoUrl: string | null;
}

/** Evento del canal de "Vincular tarjetas": una tarjeta sin dueño pasó por el lector. */
export interface TarjetaSinAsignarEvento {
  uid: string;
  /** ISO 8601. Sin hora "bonita" porque llega en vivo: el frontend calcula "hace X segundos". */
  detectadoEn: string;
}

export interface NotificacionApi {
  id: number; tipo: string; titulo: string; cuerpo: string;
  cuando: string; leida: boolean;
}

export interface ComunicadoApi {
  id: number; titulo: string; cuerpo: string; autor: string;
  dirigidoA: string; aulaId: number | null; aula: string | null;
  publicadoEn: string | null; publicado: boolean;
  lecturas: number; destinatarios: number; leidoPorMi: boolean;
}

export interface ConductaApi {
  id: number; alumnoId: number; alumno: string; codigoAlumno: string;
  aula: string; tipo: string; categoria: string; descripcion: string;
  fecha: string; registradoPor: string;
}

export interface NotaApi { cursoId: number; curso: string; abreviatura: string; calificacion: number; comentario: string | null }

export interface LibretaApi {
  id: number; alumnoId: number; codigoAlumno: string; alumno: string; aula: string;
  periodo: string; anioEscolar: number; promedio: number | null;
  observacion: string | null; publicada: boolean; publicadaEn: string | null;
  notas: NotaApi[];
  tieneArchivo: boolean; archivoUuid: string | null;
}

export interface CursoApi { id: number; nombre: string; abreviatura: string }

export interface UsuarioAdminApi {
  id: number; nombres: string; apellidos: string; correo: string;
  rol: string; estado: string; dni: string | null; telefono: string | null;
  ultimoAcceso: string | null; codigoActivacion: string | null;
}

export interface PuntoAccesoApi {
  id: number; nombre: string; activo: boolean; enLinea: boolean;
  ultimoLatido: string | null; apiKeyNueva: string | null;
}
