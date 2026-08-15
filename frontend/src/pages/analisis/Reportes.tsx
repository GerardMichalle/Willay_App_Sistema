import { useEffect, useState } from 'react';
import { Download, Loader2, FileSpreadsheet, CalendarDays, Users } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Button, PanelHead, Mono } from '../../components/ui';
import { exportarAlumnos, exportarAsistencia, getStatsHoy, type DashboardStats } from '../../services/api';

export default function Reportes() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getStatsHoy().then(setStats).catch(() => setStats(null)); }, []);

  async function descargar(tipo: 'alumnos' | 'asistencia') {
    setDescargando(tipo);
    setError(null);
    try {
      if (tipo === 'alumnos') await exportarAlumnos();
      else await exportarAsistencia(fecha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el archivo');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <>
      <Topbar title="Reportes" subtitle="Descarga de listados en formato Excel" />
      <div className="px-4 sm:px-8 pb-10 max-w-[900px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="card p-6">
          <PanelHead
            title="Padrón de estudiantes"
            sub="Listado completo con aula, tarjeta asignada y estado de matrícula"
            right={<Users size={16} className="text-ink-3" />}
          />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Mono className="!text-[11.5px]">
              {stats ? `${stats.totalAlumnos} estudiantes matriculados` : 'Cargando…'}
            </Mono>
            <Button onClick={() => descargar('alumnos')} disabled={descargando !== null}>
              {descargando === 'alumnos' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Descargar Excel
            </Button>
          </div>
        </div>

        <div className="card p-6">
          <PanelHead
            title="Asistencia por fecha"
            sub="Entradas, salidas y estado de cada estudiante en un día concreto"
            right={<CalendarDays size={16} className="text-ink-3" />}
          />
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <label className="block">
              <span className="label-mono">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="mt-1.5 rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] font-mono outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
              />
            </label>
            <Button onClick={() => descargar('asistencia')} disabled={descargando !== null}>
              {descargando === 'asistencia' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Descargar Excel
            </Button>
          </div>
        </div>

        <div className="card p-6 flex items-start gap-4">
          <span className="grid place-items-center w-10 h-10 rounded-[11px] bg-canvas text-ink-3 shrink-0">
            <FileSpreadsheet size={18} />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold">Formato de los archivos</p>
            <p className="text-[12.5px] text-ink-2 mt-1 leading-relaxed">
              Los archivos se generan en formato <b className="font-semibold">.xlsx</b>, compatibles con Excel
              y Google Sheets. El padrón usa las mismas columnas que la plantilla de importación, por lo que
              puede reutilizarse para cargar el año siguiente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
