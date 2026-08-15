import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, PlayCircle, Book, Image as ImageIcon, Plus, Upload,
  Pencil, Trash2, Download, Users, Sparkles, FolderPlus, PiggyBank,
  Wallet, Store, GraduationCap, Loader2, Globe,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Button, cn } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import {
  getCursosGratuitos, crearCurso, actualizarCurso, eliminarCurso,
  crearCategoriaCurso, eliminarCategoriaCurso, agregarRecursoCurso, eliminarRecursoCurso,
  subirDocumento, getEnlaceArchivo, uuidDeRutaArchivo,
  type CursoApiCatalogo, type DatosCurso, type DatosRecurso, type RecursoApi,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const TIPO: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  PDF: { icon: <FileText size={15} />, label: 'PDF', cls: 'bg-bad-soft text-bad' },
  VIDEO: { icon: <PlayCircle size={15} />, label: 'Video', cls: 'bg-info-soft text-info' },
  LIBRO: { icon: <Book size={15} />, label: 'Libro', cls: 'bg-warn-soft text-warn' },
  IMAGEN: { icon: <ImageIcon size={15} />, label: 'Imagen', cls: 'bg-ok-soft text-ok' },
};

/** Ilustración por módulo: identidad visual sin depender de archivos externos. */
const ILUSTRACION = [
  { icono: <PiggyBank size={26} />, fondo: 'bg-brand-soft', texto: 'text-brand' },
  { icono: <Wallet size={26} />, fondo: 'bg-ok-soft', texto: 'text-ok' },
  { icono: <Store size={26} />, fondo: 'bg-warn-soft', texto: 'text-warn' },
  { icono: <GraduationCap size={26} />, fondo: 'bg-info-soft', texto: 'text-info' },
];

const CURSO_VACIO: DatosCurso = { titulo: '', descripcion: '', portadaUrl: null, orden: 0 };
const RECURSO_VACIO: DatosRecurso = { titulo: '', tipo: 'PDF', urlArchivo: null, orden: 0 };

export default function CursosGratuitos() {
  const { usuario } = useAuth();
  /** Solo el proveedor de la plataforma gestiona el catálogo. */
  const esProveedor = usuario?.rol === 'superadmin';

  const [cursos, setCursos] = useState<CursoApiCatalogo[]>([]);
  const [cursoActivo, setCursoActivo] = useState(0);
  const [categoriaActiva, setCategoriaActiva] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formularios del proveedor
  const [cursoAbierto, setCursoAbierto] = useState(false);
  const [editandoCurso, setEditandoCurso] = useState<CursoApiCatalogo | null>(null);
  const [datosCurso, setDatosCurso] = useState<DatosCurso>(CURSO_VACIO);
  const [moduloAbierto, setModuloAbierto] = useState(false);
  const [nombreModulo, setNombreModulo] = useState('');
  const [recursoAbierto, setRecursoAbierto] = useState(false);
  const [datosRecurso, setDatosRecurso] = useState<DatosRecurso>(RECURSO_VACIO);
  const [archivoSubido, setArchivoSubido] = useState<{ nombre: string; bytes: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCursos(await getCursosGratuitos());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const curso = cursos[cursoActivo];
  const categorias = curso?.categorias ?? [];
  const activa = categorias[categoriaActiva];

  // ── Acciones del proveedor ──

  async function guardarCurso() {
    setErrorForm(null);
    setGuardando(true);
    try {
      if (editandoCurso) await actualizarCurso(editandoCurso.id, datosCurso);
      else await crearCurso(datosCurso);
      setCursoAbierto(false);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarModulo() {
    if (!curso) return;
    setGuardando(true);
    try {
      await crearCategoriaCurso(curso.id, { nombre: nombreModulo, orden: categorias.length });
      setModuloAbierto(false);
      setNombreModulo('');
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo crear el módulo');
    } finally {
      setGuardando(false);
    }
  }

  async function subir(f: File | null) {
    if (!f) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      const url = await subirDocumento(f);
      setArchivoSubido({ nombre: f.name, bytes: f.size });
      setDatosRecurso(d => ({
        ...d,
        urlArchivo: url,
        tamanoBytes: f.size,
        titulo: d.titulo || f.name.replace(/\.[^.]+$/, ''),
        tipo: f.type.startsWith('video') ? 'VIDEO'
            : f.type.startsWith('image') ? 'IMAGEN'
            : f.type.includes('epub') ? 'LIBRO' : 'PDF',
      }));
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo subir el archivo');
    } finally {
      setGuardando(false);
    }
  }

  async function guardarRecurso() {
    if (!curso || !activa) return;
    setErrorForm(null);
    setGuardando(true);
    try {
      await agregarRecursoCurso(curso.id, activa.id, {
        ...datosRecurso,
        orden: activa.recursos.length,
      });
      setRecursoAbierto(false);
      setDatosRecurso(RECURSO_VACIO);
      setArchivoSubido(null);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar el material');
    } finally {
      setGuardando(false);
    }
  }

  /** Pide el enlace firmado justo antes de abrir o descargar: nunca se guarda ni se muestra crudo. */
  async function abrirRecurso(r: RecursoApi) {
    if (!r.urlArchivo) return;
    try {
      const url = await getEnlaceArchivo(uuidDeRutaArchivo(r.urlArchivo));
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo abrir el archivo');
    }
  }

  async function descargarRecurso(r: RecursoApi) {
    if (!r.urlArchivo) return;
    try {
      const url = await getEnlaceArchivo(uuidDeRutaArchivo(r.urlArchivo));
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // el backend ya manda el nombre real (con extensión) en Content-Disposition
      a.click();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar el archivo');
    }
  }

  async function quitarRecurso(recursoId: number) {
    if (!curso || !confirm('¿Eliminar este material del catálogo?')) return;
    try {
      await eliminarRecursoCurso(curso.id, recursoId);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  async function quitarModulo() {
    if (!curso || !activa || !confirm(`¿Eliminar el módulo "${activa.nombre}" y todo su material?`)) return;
    try {
      await eliminarCategoriaCurso(curso.id, activa.id);
      setCategoriaActiva(0);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  async function quitarCurso() {
    if (!curso || !confirm(`¿Retirar "${curso.titulo}" del catálogo?`)) return;
    try {
      await eliminarCurso(curso.id);
      setCursoActivo(0);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo retirar');
    }
  }

  function abrirEdicionCurso() {
    if (!curso) return;
    setEditandoCurso(curso);
    setDatosCurso({
      titulo: curso.titulo,
      descripcion: curso.descripcion ?? '',
      portadaUrl: curso.portadaUrl,
      orden: curso.orden,
    });
    setErrorForm(null);
    setCursoAbierto(true);
  }

  return (
    <>
      <input ref={archivoRef} type="file" className="hidden"
        accept="application/pdf,image/*,video/mp4,application/epub+zip"
        onChange={e => void subir(e.target.files?.[0] ?? null)} />

      <Topbar
        title="Cursos gratuitos"
        subtitle={esProveedor
          ? 'Catálogo de la plataforma · visible para todos los colegios'
          : 'Material educativo gratuito para toda la comunidad'}
      />

      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-5">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {esProveedor && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              <Globe size={13} /> Los cursos que publiques aquí llegan a todos los colegios de la plataforma.
            </span>
            <div className="flex gap-2">
              {cursos.length > 1 && (
                <select
                  className="rounded-[10px] border border-line bg-paper px-3 py-2 text-[12.5px] outline-none"
                  value={cursoActivo}
                  onChange={e => { setCursoActivo(Number(e.target.value)); setCategoriaActiva(0); }}
                >
                  {cursos.map((c, i) => <option key={c.id} value={i}>{c.titulo}</option>)}
                </select>
              )}
              <Button onClick={() => { setEditandoCurso(null); setDatosCurso(CURSO_VACIO); setCursoAbierto(true); }}>
                <Plus size={14} /> Nuevo curso
              </Button>
            </div>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : !curso ? (
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4">
              <Sparkles size={22} />
            </span>
            <p className="text-[14px] font-semibold">Aún no hay cursos publicados</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              {esProveedor
                ? 'Publica el primero y quedará disponible para todos los colegios.'
                : 'Pronto habrá material educativo disponible.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Portada ── */}
            <div className="rounded-[18px] bg-gradient-to-r from-brand to-[#F2683C] text-white px-8 py-9 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[.13]"
                style={{ backgroundImage: 'radial-gradient(circle at 82% 28%, #fff 1.6px, transparent 1.6px)', backgroundSize: '22px 22px' }} />
              <div className="absolute -right-8 -bottom-12 opacity-[.16]"><PiggyBank size={190} strokeWidth={1} /></div>

              <div className="relative flex flex-wrap items-center justify-between gap-5">
                <div className="max-w-[560px]">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/75">
                    <Sparkles size={12} /> Curso gratuito
                  </div>
                  <h2 className="text-[27px] font-bold tracking-tight mt-2 leading-tight">{curso.titulo}</h2>
                  {curso.descripcion && (
                    <p className="text-[13.5px] text-white/90 mt-2.5 leading-relaxed">{curso.descripcion}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/15 rounded-[12px] px-5 py-3 backdrop-blur">
                    <Users size={16} />
                    <span className="text-[13.5px] font-semibold">{curso.inscritos} recursos</span>
                  </div>
                  {esProveedor && (
                    <div className="flex flex-col gap-1.5">
                      <button onClick={abrirEdicionCurso} title="Editar curso"
                        className="grid place-items-center w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur hover:bg-white/25 transition-colors cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={quitarCurso} title="Retirar curso"
                        className="grid place-items-center w-9 h-9 rounded-[10px] bg-white/15 backdrop-blur hover:bg-white/25 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Módulos ── */}
            <div className="grid sm:grid-cols-3 gap-3">
              {categorias.map((cat, i) => {
                const ilu = ILUSTRACION[i % ILUSTRACION.length];
                const activo = i === categoriaActiva;
                return (
                  <button key={cat.id} onClick={() => setCategoriaActiva(i)}
                    className={cn('flex items-center gap-3.5 rounded-[14px] border px-4 py-3.5 text-left transition-all cursor-pointer',
                      activo ? 'border-brand bg-brand-faint shadow-sm' : 'border-line bg-paper hover:border-line-2')}>
                    <span className={cn('grid place-items-center w-11 h-11 rounded-[12px] shrink-0', ilu.fondo, ilu.texto)}>
                      {ilu.icono}
                    </span>
                    <div className="min-w-0">
                      <p className={cn('label-mono !text-[9px]', activo && '!text-brand')}>Módulo {i + 1}</p>
                      <p className={cn('text-[13px] font-bold leading-tight mt-0.5', activo && 'text-brand')}>{cat.nombre}</p>
                    </div>
                  </button>
                );
              })}

              {esProveedor && (
                <button onClick={() => setModuloAbierto(true)}
                  className="flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-2 px-4 py-3.5 text-[12.5px] font-semibold text-ink-3 hover:text-brand hover:border-brand transition-colors cursor-pointer">
                  <FolderPlus size={16} /> Agregar módulo
                </button>
              )}
            </div>

            {/* ── Material del módulo ── */}
            {activa && (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold tracking-tight">{activa.nombre}</h3>
                    <p className="text-[12px] text-ink-3 mt-0.5">
                      {activa.recursos.length} {activa.recursos.length === 1 ? 'recurso' : 'recursos'} disponibles
                    </p>
                  </div>
                  {esProveedor && (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={quitarModulo}><Trash2 size={14} /> Módulo</Button>
                      <Button onClick={() => { setDatosRecurso(RECURSO_VACIO); setArchivoSubido(null); setErrorForm(null); setRecursoAbierto(true); }}>
                        <Upload size={14} /> Subir material
                      </Button>
                    </div>
                  )}
                </div>

                {activa.recursos.length === 0 ? (
                  <div className="card p-10 text-center">
                    <p className="text-[13px] font-semibold">Este módulo aún no tiene material</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {activa.recursos.map((r, i) => {
                      const t = TIPO[r.tipo] ?? TIPO.PDF;
                      const ilu = ILUSTRACION[i % ILUSTRACION.length];
                      return (
                        <div key={r.id} className="card p-0 overflow-hidden group">
                          <div className={cn('h-[124px] grid place-items-center relative', ilu.fondo)}>
                            <span className={cn('opacity-70', ilu.texto)}>
                              {r.tipo === 'VIDEO' ? <PlayCircle size={46} strokeWidth={1.4} />
                                : r.tipo === 'LIBRO' ? <Book size={44} strokeWidth={1.4} />
                                : r.tipo === 'IMAGEN' ? <ImageIcon size={44} strokeWidth={1.4} />
                                : <FileText size={44} strokeWidth={1.4} />}
                            </span>
                            <span className={cn('absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 bg-paper/90 backdrop-blur text-[10.5px] font-semibold', t.cls)}>
                              {t.icon} {t.label}
                            </span>
                            {esProveedor && (
                              <button onClick={() => quitarRecurso(r.id)} title="Eliminar"
                                className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-[8px] bg-paper/90 backdrop-blur text-ink-3 hover:text-bad transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>

                          <div className="p-5">
                            <p className="text-[14px] font-bold tracking-tight leading-snug">{r.titulo}</p>
                            <p className="text-[11.5px] text-ink-3 mt-1.5 font-mono">
                              {t.label}{r.tamano ? ` · ${r.tamano}` : ''}{r.duracion ? ` · ${r.duracion}` : ''}
                            </p>
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => void abrirRecurso(r)}
                                disabled={!r.urlArchivo}
                                className={cn('flex-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-2.5 text-[12.5px] font-semibold transition-colors cursor-pointer',
                                  r.urlArchivo ? 'bg-brand text-white hover:bg-brand-strong' : 'bg-canvas text-ink-3 pointer-events-none')}
                              >
                                {r.tipo === 'VIDEO' ? <><PlayCircle size={14} /> Reproducir</> : <><Book size={14} /> Ver</>}
                              </button>
                              <button
                                onClick={() => void descargarRecurso(r)}
                                disabled={!r.urlArchivo}
                                className={cn('inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-line px-3 py-2.5 text-[12.5px] font-semibold transition-colors cursor-pointer',
                                  r.urlArchivo ? 'text-ink-2 hover:text-ink hover:border-line-2' : 'text-ink-3 pointer-events-none')}
                              >
                                <Download size={14} /> Descargar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Formularios del proveedor ── */}
      <Modal
        abierto={cursoAbierto}
        titulo={editandoCurso ? 'Editar curso' : 'Nuevo curso'}
        subtitulo="Quedará disponible para todos los colegios de la plataforma"
        onCerrar={() => setCursoAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setCursoAbierto(false)}>Cancelar</Button>
            <Button onClick={guardarCurso} disabled={!datosCurso.titulo.trim() || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Guardar
            </Button>
          </>
        }
      >
        {errorForm && <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>}
        <Campo etiqueta="Título" requerido>
          <input className={claseInput} value={datosCurso.titulo} autoFocus
            onChange={e => setDatosCurso({ ...datosCurso, titulo: e.target.value })}
            placeholder="Economía y Finanzas" />
        </Campo>
        <Campo etiqueta="Descripción">
          <textarea className={`${claseInput} min-h-[90px] resize-y`} value={datosCurso.descripcion ?? ''}
            onChange={e => setDatosCurso({ ...datosCurso, descripcion: e.target.value })}
            placeholder="Para qué sirve este curso y a quién está dirigido…" />
        </Campo>
        <Campo etiqueta="Orden en el catálogo">
          <input type="number" className={claseInput} value={datosCurso.orden}
            onChange={e => setDatosCurso({ ...datosCurso, orden: Number(e.target.value) })} />
        </Campo>
      </Modal>

      <Modal
        abierto={moduloAbierto}
        titulo="Nuevo módulo"
        subtitulo="Agrupa el material por tema"
        onCerrar={() => setModuloAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setModuloAbierto(false)}>Cancelar</Button>
            <Button onClick={guardarModulo} disabled={!nombreModulo.trim() || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Crear
            </Button>
          </>
        }
      >
        <Campo etiqueta="Nombre del módulo" requerido>
          <input className={claseInput} value={nombreModulo} autoFocus
            onChange={e => setNombreModulo(e.target.value)} placeholder="Ahorro y presupuesto" />
        </Campo>
      </Modal>

      <Modal
        abierto={recursoAbierto}
        titulo="Subir material"
        subtitulo={activa?.nombre}
        onCerrar={() => setRecursoAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setRecursoAbierto(false)}>Cancelar</Button>
            <Button onClick={guardarRecurso} disabled={!datosRecurso.titulo.trim() || !datosRecurso.urlArchivo || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Publicar
            </Button>
          </>
        }
      >
        {errorForm && <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>}

        <Campo etiqueta="Archivo" requerido>
          <button onClick={() => archivoRef.current?.click()} disabled={guardando}
            className="w-full rounded-[10px] border border-dashed border-line-2 px-4 py-6 text-center hover:border-brand transition-colors cursor-pointer">
            {archivoSubido ? (
              <>
                <p className="text-[13px] font-semibold text-ok">{archivoSubido.nombre}</p>
                <p className="text-[11.5px] text-ink-3 mt-1">Subido · toca para reemplazar</p>
              </>
            ) : (
              <>
                <Upload size={20} className="mx-auto text-ink-3 mb-2" />
                <p className="text-[12.5px] font-semibold">Selecciona un archivo</p>
                <p className="text-[11px] text-ink-3 mt-1">PDF, imagen, video MP4 o EPUB · máximo 25 MB</p>
              </>
            )}
          </button>
        </Campo>

        <Campo etiqueta="Título" requerido>
          <input className={claseInput} value={datosRecurso.titulo}
            onChange={e => setDatosRecurso({ ...datosRecurso, titulo: e.target.value })}
            placeholder="¿Qué es el dinero? · Guía ilustrada" />
        </Campo>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Tipo">
            <select className={claseInput} value={datosRecurso.tipo}
              onChange={e => setDatosRecurso({ ...datosRecurso, tipo: e.target.value })}>
              <option value="PDF">PDF</option>
              <option value="VIDEO">Video</option>
              <option value="LIBRO">Libro</option>
              <option value="IMAGEN">Imagen</option>
            </select>
          </Campo>
          {datosRecurso.tipo === 'VIDEO' && (
            <Campo etiqueta="Duración (segundos)">
              <input type="number" className={claseInput} value={datosRecurso.duracionSeg ?? ''}
                onChange={e => setDatosRecurso({ ...datosRecurso, duracionSeg: Number(e.target.value) || null })} />
            </Campo>
          )}
        </div>
      </Modal>
    </>
  );
}
