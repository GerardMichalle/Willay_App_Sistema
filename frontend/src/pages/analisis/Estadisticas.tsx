import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Users, Clock, UserX, Megaphone, Radio } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, PanelHead, Mono, cn } from '../../components/ui';
import { getStatsHoy, type DashboardStats } from '../../services/api';

export default function Estadisticas() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStatsHoy()
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar los indicadores'))
      .finally(() => setCargando(false));
  }, []);

  const maxSemana = Math.max(1, ...(stats?.semana ?? []).map(d => d.entradas));
  const hoyIso = new Date().toISOString().slice(0, 10);
  const totalSemana = (stats?.semana ?? []).reduce((s, d) => s + d.entradas, 0);
  const diasConDatos = (stats?.semana ?? []).filter(d => d.entradas > 0).length;
  const promedioDiario = diasConDatos ? Math.round(totalSemana / diasConDatos) : 0;
  const tasaAsistencia = stats && stats.totalAlumnos > 0
    ? ((stats.presentes / stats.totalAlumnos) * 100).toFixed(1) : '0';

  return (
    <>
      <Topbar title="Estadísticas" subtitle="Indicadores calculados sobre los registros del colegio" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard icon={<TrendingUp size={19} strokeWidth={1.7} />} label="Asistencia hoy"
                value={`${tasaAsistencia}%`} note={`${stats.presentes} de ${stats.totalAlumnos}`} noteTone="ok" />
              <StatCard icon={<Clock size={19} strokeWidth={1.7} />} label="Tardanzas hoy"
                value={String(stats.tardanzas)} note="Ingresaron fuera de hora" noteTone="warn" />
              <StatCard icon={<UserX size={19} strokeWidth={1.7} />} label="Ausentes hoy"
                value={String(stats.ausentes)} note="Sin registro de ingreso" noteTone="bad" />
              <StatCard icon={<Users size={19} strokeWidth={1.7} />} label="Promedio semanal"
                value={String(promedioDiario)} note="Entradas por día lectivo" noteTone="neutral" />
            </div>

            <div className="card p-6">
              <PanelHead title="Entradas de la semana" sub="Registros diarios del lector de acceso" />
              <div className="flex items-end justify-between gap-2 h-[180px] mt-4">
                {stats.semana.map(d => {
                  const futuro = d.fecha > hoyIso;
                  const altura = futuro ? 0 : Math.max(4, (d.entradas / maxSemana) * 100);
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                      <span className={cn('text-[12px] font-semibold', futuro ? 'text-ink-3' : 'text-ink')}>
                        {futuro ? '—' : d.entradas}
                      </span>
                      <div
                        className={cn('w-full rounded-t-[6px] transition-[height] duration-700',
                          futuro ? 'bg-line' : d.entradas === maxSemana ? 'bg-brand' : 'bg-brand/40')}
                        style={{ height: `${altura}%` }}
                      />
                      <span className="label-mono">{d.diaCorto}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid xl:grid-cols-3 gap-4">
              <div className="card p-6">
                <PanelHead title="Personal docente" right={<Users size={16} className="text-ink-3" />} />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold tracking-tight">{stats.docentesActivos}</span>
                  <span className="text-[13px] text-ink-3">/ {stats.docentesTotal}</span>
                </div>
                <Mono className="!text-[11px] mt-1 block">En actividad</Mono>
              </div>

              <div className="card p-6">
                <PanelHead title="Familias conectadas" right={<Users size={16} className="text-ink-3" />} />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold tracking-tight text-ok">{stats.apoderadosConCuenta}</span>
                  <span className="text-[13px] text-ink-3">/ {stats.apoderadosTotal}</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-canvas overflow-hidden">
                  <div className="h-full bg-ok rounded-full transition-[width] duration-700"
                    style={{ width: `${stats.apoderadosTotal ? (stats.apoderadosConCuenta / stats.apoderadosTotal) * 100 : 0}%` }} />
                </div>
              </div>

              <div className="card p-6">
                <PanelHead title="Infraestructura" right={<Radio size={16} className="text-ink-3" />} />
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-[26px] font-bold tracking-tight',
                    stats.lectoresEnLinea > 0 ? 'text-ok' : 'text-ink-3')}>
                    {stats.lectoresEnLinea}
                  </span>
                  <span className="text-[13px] text-ink-3">/ {stats.lectoresTotal} lectores</span>
                </div>
                <Mono className="!text-[11px] mt-1 block">
                  <Megaphone size={10} className="inline mr-1" />{stats.comunicadosPublicados} comunicados publicados
                </Mono>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
