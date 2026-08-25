import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Mono, Pill } from '../../components/ui';
import { claseInput } from '../../components/Modal';
import { getAuditoria, getColegios } from '../../services/api';
import type { AuditoriaGlobalApi, ColegioApi } from '../../types';

/** Mismo catálogo que el enum AccionAuditoria del backend. */
const ACCIONES = [
  'LOGIN_OK', 'LOGIN_FALLIDO', 'LOGOUT',
  'CUENTA_ACTIVADA', 'ACTIVACION_FALLIDA',
  'TOKEN_REFRESCADO', 'PASSWORD_CAMBIADA', 'PASSWORD_RECUPERADA',
  'ACCESO_BLOQUEADO_POR_INTENTOS',
  'ALUMNO_CREADO', 'ALUMNO_ACTUALIZADO', 'ALUMNO_RETIRADO', 'TARJETA_VINCULADA', 'CUENTA_ALUMNO_CREADA',
  'DOCENTE_CREADO', 'DOCENTE_ACTUALIZADO', 'DOCENTE_CESADO',
  'CUENTA_APODERADO_CREADA', 'APODERADO_ELIMINADO',
  'AULA_CREADA', 'AULA_ACTUALIZADA', 'AULA_DESACTIVADA',
  'MATRICULA_REGISTRADA', 'IMPORTACION_MASIVA',
  'COLEGIO_CREADO', 'COLEGIO_ESTADO_CAMBIADO', 'COLEGIO_PAGO_ACTUALIZADO',
];

/** Tono del Pill según qué tan sensible es la acción, para que salte a la vista lo relevante. */
function tonoAccion(accion: string): 'bad' | 'warn' | 'ok' | 'neutral' {
  if (accion.includes('BLOQUEADO') || accion.includes('FALLIDO') || accion.includes('FALLIDA')) return 'bad';
  if (accion.includes('RETIRADO') || accion.includes('CESADO') || accion.includes('ELIMINADO') || accion.includes('DESACTIVADA')) return 'warn';
  if (accion.includes('CREADO') || accion.includes('CREADA') || accion.includes('ACTIVADA')) return 'ok';
  return 'neutral';
}

export default function Auditoria() {
  const [colegios, setColegios] = useState<ColegioApi[]>([]);
  const [filtroColegio, setFiltroColegio] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');

  const [lista, setLista] = useState<AuditoriaGlobalApi[]>([]);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getColegios().then(setColegios).catch(() => {}); }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await getAuditoria({
        colegioId: filtroColegio ? Number(filtroColegio) : undefined,
        accion: filtroAccion || undefined,
        pagina,
        tamano: 50,
      });
      setLista(r.contenido);
      setTotalPaginas(r.totalPaginas);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la auditoría');
    } finally {
      setCargando(false);
    }
  }, [filtroColegio, filtroAccion, pagina]);

  useEffect(() => { void cargar(); }, [cargar]);

  // Cualquier cambio de filtro vuelve a la primera página: una página 4 con
  // el filtro anterior puede no existir con el filtro nuevo.
  function cambiarFiltroColegio(v: string) { setFiltroColegio(v); setPagina(0); }
  function cambiarFiltroAccion(v: string) { setFiltroAccion(v); setPagina(0); }

  return (
    <>
      <Topbar title="Auditoría" subtitle="Panel del proveedor · eventos de todos los colegios" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select className={`${claseInput} !w-auto`} value={filtroColegio} onChange={e => cambiarFiltroColegio(e.target.value)}>
            <option value="">Todos los colegios</option>
            {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={`${claseInput} !w-auto`} value={filtroAccion} onChange={e => cambiarFiltroAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {ACCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-[12px] text-ink-3 ml-auto">{total} eventos</span>
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : lista.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">No hay eventos con estos filtros</p>
          </div>
        ) : (
          <>
            <Table head={['Fecha', 'Colegio', 'Acción', 'Detalle']}>
              {lista.map(a => (
                <Tr key={a.id}>
                  <Td><Mono className="!text-[11px]">{new Date(a.creadoEn).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</Mono></Td>
                  <Td>{a.colegioNombre ?? <span className="text-ink-3">—</span>}</Td>
                  <Td><Pill tone={tonoAccion(a.accion)}>{a.accion}</Pill></Td>
                  <Td className="max-w-[360px]">
                    <span className="block truncate text-[12.5px] text-ink-2" title={a.detalle ?? undefined}>
                      {a.detalle ?? <span className="text-ink-3">—</span>}
                    </span>
                  </Td>
                </Tr>
              ))}
            </Table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPagina(p => Math.max(0, p - 1))}
                  disabled={pagina === 0}
                  className="grid place-items-center w-8 h-8 rounded-[8px] border border-line text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <Mono className="!text-[12px]">Página {pagina + 1} de {totalPaginas}</Mono>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                  disabled={pagina >= totalPaginas - 1}
                  className="grid place-items-center w-8 h-8 rounded-[8px] border border-line text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
