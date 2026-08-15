import { useEffect, useState } from 'react';
import { Loader2, BookOpen, FileText, Download, ExternalLink } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { FilterTabs } from '../../components/ui';
import { getLibretas, getEnlaceArchivo } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { LibretaApi } from '../../types';

export default function Libreta() {
  const { usuario } = useAuth();
  const esApoderado = usuario?.rol === 'apoderado';

  const [libretas, setLibretas] = useState<LibretaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [abriendoId, setAbriendoId] = useState<number | null>(null);

  useEffect(() => {
    getLibretas()
      .then(l => {
        setLibretas(l);
        if (l.length > 0) setPeriodo(l[0].periodo);
      })
      .catch(() => setLibretas([]))
      .finally(() => setCargando(false));
  }, []);

  const periodos = [...new Set(libretas.map(l => l.periodo))];
  const visibles = libretas.filter(l => l.periodo === periodo);

  async function abrir(l: LibretaApi) {
    if (!l.archivoUuid) return;
    setAbriendoId(l.id);
    try {
      const url = await getEnlaceArchivo(l.archivoUuid);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      alert('No se pudo abrir la libreta');
    } finally {
      setAbriendoId(null);
    }
  }

  async function descargar(l: LibretaApi) {
    if (!l.archivoUuid) return;
    setAbriendoId(l.id);
    try {
      const url = await getEnlaceArchivo(l.archivoUuid);
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // el backend ya manda el nombre real (con extensión) en Content-Disposition
      a.click();
    } catch {
      alert('No se pudo descargar la libreta');
    } finally {
      setAbriendoId(null);
    }
  }

  return (
    <>
      <Topbar
        title={esApoderado ? 'Libreta de notas' : 'Mis notas'}
        subtitle={cargando ? 'Cargando…' : `${libretas.length} libretas publicadas`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1000px] space-y-4">

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : libretas.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4">
              <BookOpen size={22} />
            </span>
            <p className="text-[14px] font-semibold">Todavía no hay libretas publicadas</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[380px] mx-auto">
              Cuando el tutor del aula publique la libreta del periodo, aparecerá aquí y recibirás una notificación.
            </p>
          </div>
        ) : (
          <>
            {periodos.length > 1 && (
              <FilterTabs tabs={periodos} active={periodo ?? periodos[0]} onChange={setPeriodo} />
            )}

            {visibles.map(l => (
              <div key={l.id} className="card p-6 flex items-center gap-4">
                <span className="grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand shrink-0">
                  <FileText size={20} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold tracking-tight">
                    {esApoderado ? `${l.alumno} · ${l.periodo}` : `${l.periodo} · ${l.anioEscolar}`}
                  </p>
                  <p className="text-[12px] text-ink-3 mt-0.5">
                    {l.publicadaEn ? `Publicada el ${l.publicadaEn}` : 'Publicada'}
                    {esApoderado ? ` · ${l.aula}` : ''}
                  </p>
                </div>
                {l.archivoUuid ? (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => void abrir(l)} disabled={abriendoId === l.id}
                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand text-white px-3.5 py-2.5 text-[12.5px] font-semibold hover:bg-brand-strong transition-colors cursor-pointer disabled:opacity-50">
                      {abriendoId === l.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} Ver
                    </button>
                    <button onClick={() => void descargar(l)} disabled={abriendoId === l.id}
                      className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2 hover:text-ink hover:border-line-2 transition-colors cursor-pointer disabled:opacity-50">
                      <Download size={14} /> Descargar
                    </button>
                  </div>
                ) : (
                  <p className="text-[11.5px] text-ink-3 shrink-0">Sin documento</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
