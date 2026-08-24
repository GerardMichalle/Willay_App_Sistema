import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, EstadoBadge, Mono, Button, FilterTabs } from '../../components/ui';
import { claseInput } from '../../components/Modal';
import { getHistorialAsistencia, exportarAsistencia } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { AsistenciaHistorialApi, EstadoAsistencia } from '../../types';

const TABS = ['Hoy', 'Esta semana', 'Este mes', 'Bimestre'];

const ESTADO_MAP: Record<string, EstadoAsistencia> = {
  PUNTUAL: 'puntual', TARDANZA: 'tardanza', AUSENTE: 'ausente', JUSTIFICADO: 'justificado',
};

/** yyyy-MM-dd en hora local, sin pasar por UTC (evita el corrimiento de un día de toISOString). */
function comoIso(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/** Rango real por pestaña. "Bimestre" no tiene fechas fijas en el sistema: se aproxima a los últimos 60 días. */
function rangoPara(tab: string): { desde: string; hasta: string } {
  const hoy = new Date();
  const hasta = comoIso(hoy);
  const desde = new Date(hoy);
  if (tab === 'Esta semana') {
    const diaDesdeLunes = (hoy.getDay() + 6) % 7;
    desde.setDate(hoy.getDate() - diaDesdeLunes);
  } else if (tab === 'Este mes') {
    desde.setDate(1);
  } else if (tab === 'Bimestre') {
    desde.setDate(hoy.getDate() - 60);
  }
  return { desde: tab === 'Hoy' ? hasta : comoIso(desde), hasta };
}

function fechaCorta(iso: string) {
  const f = new Date(iso + 'T12:00:00');
  return f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();
}

export default function Historial() {
  const { usuario } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('Hoy');
  const [grado, setGrado] = useState('');
  const [filas, setFilas] = useState<AsistenciaHistorialApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { desde, hasta } = rangoPara(tab);
    setCargando(true);
    setError(null);
    getHistorialAsistencia(desde, hasta)
      .then(setFilas)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo cargar el historial'))
      .finally(() => setCargando(false));
  }, [tab]);

  // El filtro de grado solo tiene sentido cuando el rol ve más de un aula (admin/dirección)
  const grados = useMemo(() => {
    const set = new Set(filas.map(f => `${f.grado ?? ''} "${f.seccion ?? ''}"`).filter(g => g.trim() !== '""'));
    return Array.from(set).sort();
  }, [filas]);

  useEffect(() => { if (grado && !grados.includes(grado)) setGrado(''); }, [grados, grado]);

  const filtradas = grado ? filas.filter(f => `${f.grado ?? ''} "${f.seccion ?? ''}"` === grado) : filas;

  return (
    <>
      <Topbar
        title={usuario?.rol === 'alumno' ? 'Mi asistencia'
          : usuario?.rol === 'apoderado' ? 'Asistencia de mis hijos'
          : 'Historial de asistencia'}
        subtitle={cargando ? 'Cargando…' : `${filtradas.length} registro${filtradas.length === 1 ? '' : 's'} en este periodo`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex gap-2">
            {grados.length > 1 && (
              <select value={grado} onChange={e => setGrado(e.target.value)} className={`${claseInput} !w-auto`}>
                <option value="">Todos los grados</option>
                {grados.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            <Button variant="ghost" onClick={() => exportarAsistencia().catch(e => toast(e instanceof Error ? e.message : 'No se pudo exportar'))}>
              <Download size={14} /> Exportar
            </Button>
          </div>
        </div>

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : filtradas.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Sin registros en este periodo</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">Prueba con otro rango de fechas.</p>
          </div>
        ) : (
          <Table head={['Alumno', 'Grado', 'Fecha', 'Entrada', 'Salida', 'Estado']}>
            {filtradas.map((f, i) => (
              <Tr key={`${f.alumnoId}-${f.fecha}-${i}`}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={f.nombreAlumno} size="sm" />
                    <span className="font-semibold text-[13px]">{f.nombreAlumno}</span>
                  </div>
                </Td>
                <Td><Mono>{f.grado} "{f.seccion}"</Mono></Td>
                <Td><Mono>{fechaCorta(f.fecha)}</Mono></Td>
                <Td><Mono className="font-semibold !text-ink">{f.horaEntrada ?? '—'}</Mono></Td>
                <Td><Mono className="font-semibold !text-ink">{f.horaSalida ?? '—'}</Mono></Td>
                <Td><EstadoBadge estado={ESTADO_MAP[f.estado] ?? 'ausente'} /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
