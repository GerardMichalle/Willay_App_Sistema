import { useEffect, useMemo, useState } from 'react';
import {
  X, PlayCircle, FileText, Book, Image as ImageIcon, Download,
  ChevronRight, FolderOpen, CircleDot, Loader2, FileWarning,
} from 'lucide-react';
import { cn } from '../ui';
import { getEnlaceArchivo, uuidDeRutaArchivo, type CursoApiCatalogo, type RecursoApi } from '../../services/api';

const ICONO_TIPO: Record<string, React.ReactNode> = {
  PDF: <FileText size={14} />,
  VIDEO: <PlayCircle size={14} />,
  LIBRO: <Book size={14} />,
  IMAGEN: <ImageIcon size={14} />,
};

/**
 * Visor de un curso: reproductor/vista previa a la izquierda, lista de
 * capítulos (módulos → recursos) a la derecha. Reemplaza el "abrir en
 * pestaña nueva" de CursosGratuitos.tsx solo para la experiencia de
 * consumo — el alta/edición del catálogo sigue igual, fuera de aquí.
 *
 * No inventa progreso de avance (sin "visto"/"completado"): Willay no
 * rastrea eso todavía, y mostrar checks falsos sería mentirle al usuario.
 */
export default function ModalVisorCurso({
  curso, recursoInicial, abierto, onCerrar,
}: {
  curso: CursoApiCatalogo | null;
  recursoInicial: RecursoApi | null;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [activoId, setActivoId] = useState<number | null>(null);
  const [urlResuelta, setUrlResuelta] = useState<string | null>(null);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);

  useEffect(() => {
    if (abierto) setActivoId(recursoInicial?.id ?? null);
    // Solo al abrir: una vez dentro, activoId lo controla el clic en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [abierto, onCerrar]);

  const activo = useMemo(() => {
    for (const cat of curso?.categorias ?? []) {
      const r = cat.recursos.find(x => x.id === activoId);
      if (r) return r;
    }
    return null;
  }, [curso, activoId]);

  useEffect(() => {
    setUrlResuelta(null);
    if (!activo?.urlArchivo) return;
    let vigente = true;
    setCargandoArchivo(true);
    getEnlaceArchivo(uuidDeRutaArchivo(activo.urlArchivo))
      .then(u => { if (vigente) setUrlResuelta(u); })
      .catch(() => { if (vigente) setUrlResuelta(null); })
      .finally(() => { if (vigente) setCargandoArchivo(false); });
    return () => { vigente = false; };
  }, [activo?.id, activo?.urlArchivo]);

  if (!abierto || !curso) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-[fadeIn_.2s_ease]" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-[1080px] h-[94vh] sm:h-[82vh] flex flex-col bg-paper rounded-t-[18px] sm:rounded-[16px] border border-line shadow-2xl animate-rise overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-line shrink-0">
          <div className="min-w-0">
            <p className="label-mono !text-brand">Curso gratuito</p>
            <h2 className="text-[15px] font-bold tracking-tight truncate">{curso.titulo}</h2>
          </div>
          <button
            onClick={onCerrar}
            className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* ── Reproductor / vista previa ── */}
          <div className="flex-1 min-w-0 overflow-y-auto scroll-thin px-5 py-5">
            <div className="rounded-[14px] overflow-hidden bg-[#101113] aspect-video grid place-items-center relative">
              {cargandoArchivo ? (
                <Loader2 size={28} className="text-white/50 animate-spin" />
              ) : !activo ? (
                <p className="text-[12.5px] text-white/50">Selecciona un material de la lista</p>
              ) : !activo.urlArchivo ? (
                <div className="text-center px-6">
                  <FileWarning size={28} className="text-white/40 mx-auto mb-2.5" />
                  <p className="text-[13px] font-semibold text-white/80">Este material todavía no tiene un archivo cargado</p>
                  <p className="text-[11.5px] text-white/40 mt-1">El proveedor aún no subió el contenido.</p>
                </div>
              ) : activo.tipo === 'VIDEO' ? (
                <video key={urlResuelta} controls autoPlay className="w-full h-full" src={urlResuelta ?? undefined} />
              ) : activo.tipo === 'IMAGEN' ? (
                <img src={urlResuelta ?? undefined} alt={activo.titulo} className="w-full h-full object-contain" />
              ) : activo.tipo === 'PDF' ? (
                <iframe src={urlResuelta ?? undefined} title={activo.titulo} className="w-full h-full bg-white" />
              ) : (
                <div className="text-center px-6">
                  <Book size={28} className="text-white/50 mx-auto mb-2.5" />
                  <p className="text-[13px] font-semibold text-white/80">Este formato se abre aparte</p>
                  <a href={urlResuelta ?? undefined} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 rounded-[10px] bg-white text-ink px-3.5 py-2 text-[12.5px] font-semibold hover:bg-white/90 transition-colors">
                    <Download size={14} /> Descargar para leer
                  </a>
                </div>
              )}
            </div>

            {activo && (
              <div className="mt-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-bold tracking-tight leading-snug">{activo.titulo}</h3>
                  {activo.urlArchivo && (
                    <a href={urlResuelta ?? undefined} download
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-[9px] border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink hover:border-line-2 transition-colors">
                      <Download size={13} /> Descargar
                    </a>
                  )}
                </div>
                <p className="text-[11.5px] text-ink-3 mt-1 font-mono">
                  {ICONO_TIPO[activo.tipo]} {activo.tipo}
                  {activo.tamano ? ` · ${activo.tamano}` : ''}{activo.duracion ? ` · ${activo.duracion}` : ''}
                </p>
                {curso.descripcion && (
                  <p className="text-[13px] text-ink-2 leading-relaxed mt-3 pt-3 border-t border-line">{curso.descripcion}</p>
                )}
              </div>
            )}
          </div>

          {/* ── Lista de capítulos ── */}
          <div className="lg:w-[300px] shrink-0 border-t lg:border-t-0 lg:border-l border-line overflow-y-auto scroll-thin bg-canvas/40">
            {curso.categorias.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 sticky top-0 bg-canvas/95 backdrop-blur">
                  <FolderOpen size={12} className="text-ink-3 shrink-0" />
                  <p className="label-mono !text-[9.5px] truncate">{cat.nombre}</p>
                </div>
                {cat.recursos.map(r => {
                  const esActivo = r.id === activoId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActivoId(r.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer border-l-[3px]',
                        esActivo ? 'border-brand bg-brand-faint' : 'border-transparent hover:bg-canvas',
                      )}
                    >
                      <span className={cn('shrink-0', esActivo ? 'text-brand' : 'text-ink-3')}>
                        {esActivo ? <CircleDot size={15} /> : (ICONO_TIPO[r.tipo] ?? <FileText size={14} />)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-[12.5px] leading-snug line-clamp-2', esActivo ? 'font-semibold text-brand' : 'text-ink-2')}>
                          {r.titulo}
                        </span>
                        {(r.duracion || r.tamano) && (
                          <span className="block text-[10.5px] text-ink-3 font-mono mt-0.5">{r.duracion || r.tamano}</span>
                        )}
                      </span>
                      {!esActivo && <ChevronRight size={13} className="text-ink-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
