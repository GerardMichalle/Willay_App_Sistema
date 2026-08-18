import { useEffect, useState } from 'react';
import {
  Users, Clock, UserX, Presentation, ChevronRight, Bell, Rocket,
  CalendarDays, Megaphone, Cake, HeartHandshake,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import GateTicker from '../components/GateTicker';
import { StatCard, PanelHead, Avatar, Mono, Pill, cn } from '../components/ui';
import { getStatsHoy, getComunicadosApi, getLecturasVivo, getAlumnos, getSetupEstado,
  type DashboardStats } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { SetupEstado, ComunicadoApi, Alumno } from '../types';

/** Un ítem de "Actividad reciente": combina lecturas y comunicados reales, ya sucedidos. */
interface ActividadItem { id: string; texto: string; detalle: string; hora: string; ts: number }

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [setup, setSetup] = useState<SetupEstado | null>(null);
  const [comunicados, setComunicados] = useState<ComunicadoApi[]>([]);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [cumples, setCumples] = useState<Alumno[]>([]);

  useEffect(() => {
    getStatsHoy()
      .then(setStats)
      .catch(e => setErrorStats(e instanceof Error ? e.message : 'No se pudieron cargar los indicadores'));
    getSetupEstado().then(setSetup).catch(() => setSetup(null));

    Promise.all([
      getLecturasVivo().catch(() => []),
      getComunicadosApi().catch(() => []),
    ]).then(([lecturas, todosComunicados]) => {
      const publicados = todosComunicados.filter(c => c.publicado);
      setComunicados(publicados.slice(0, 3));

      const hoy = new Date();
      const deLecturas: ActividadItem[] = lecturas.slice(0, 8).map(l => {
        const [h, m] = l.hora.split(':').map(Number);
        const ts = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, m).getTime();
        return {
          id: `l-${l.id}`,
          texto: `${l.nombre} registró ${l.tipo === 'ENTRADA' ? 'entrada' : 'salida'}`,
          detalle: l.puntoAcceso,
          hora: l.hora,
          ts,
        };
      });
      // publicadoEn solo trae fecha, no hora exacta (p. ej. "18 Aug 2026"): se ordena
      // al final de ese día para no enterrarlo bajo lecturas de esa misma fecha.
      const deComunicados: ActividadItem[] = publicados
        .filter(c => c.publicadoEn)
        .slice(0, 5)
        .map(c => {
          const fin = new Date(c.publicadoEn as string);
          fin.setHours(23, 59, 59, 999);
          return {
            id: `c-${c.id}`,
            texto: `${c.autor} publicó un comunicado`,
            detalle: c.titulo,
            hora: c.publicadoEn as string,
            ts: fin.getTime(),
          };
        });
      setActividad([...deLecturas, ...deComunicados].sort((a, b) => b.ts - a.ts).slice(0, 6));
    });

    getAlumnos()
      .then(al => {
        const hoy = new Date();
        const md = `${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        setCumples(al.filter(a => a.fechaNacimiento && a.fechaNacimiento.slice(5) === md));
      })
      .catch(() => setCumples([]));
  }, []);

  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const hoyIso = new Date().toISOString().slice(0, 10);
  const mejorDia = (stats?.semana ?? []).reduce<{ diaCorto: string; entradas: number } | null>(
    (mejor, d) => (d.entradas > 0 && (!mejor || d.entradas > mejor.entradas) ? d : mejor), null);
  const porcentajeFamilias = stats && stats.apoderadosTotal > 0
    ? ((stats.apoderadosConCuenta / stats.apoderadosTotal) * 100).toFixed(1)
    : '0';
  const rangoSemana = stats?.semana?.length
    ? `${stats.semana[0].fecha.slice(8)}/${stats.semana[0].fecha.slice(5, 7)} – ${stats.semana[6].fecha.slice(8)}/${stats.semana[6].fecha.slice(5, 7)}`
    : '';

  return (
    <>
      <Topbar title={`${saludo}, ${usuario?.nombre.split(' ')[0]}`} />
      <div className="px-4 sm:px-8 pb-10 space-y-4 max-w-[1280px]">

        {errorStats && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{errorStats}</p>
          </div>
        )}

        {/* Asistente de puesta en marcha: solo mientras falte configurar algo */}
        {setup && !setup.completo && (
          <div className="card p-6 border-brand-soft bg-brand-faint">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-[260px]">
                <div className="flex items-center gap-2">
                  <Rocket size={16} className="text-brand" />
                  <p className="text-[14px] font-bold tracking-tight">Configuración inicial de {setup.colegioNombre}</p>
                </div>
                <p className="text-[12.5px] text-ink-2 mt-1.5">
                  Siguiente paso: <b className="font-semibold text-ink">{setup.siguientePaso}</b>
                </p>
                <div className="mt-3 h-2 rounded-full bg-paper overflow-hidden max-w-[420px]">
                  <div className="h-full bg-brand rounded-full transition-[width] duration-700"
                    style={{ width: `${setup.porcentaje}%` }} />
                </div>
                <p className="label-mono mt-1.5">{setup.porcentaje}% completado</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/aulas" className="rounded-[10px] border border-line bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink transition-colors">
                  {setup.aulas} aulas
                </Link>
                <Link to="/matriculas" className="rounded-[10px] border border-line bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink transition-colors">
                  {setup.alumnos} alumnos
                </Link>
                <Link to="/docentes" className="rounded-[10px] border border-line bg-paper px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink transition-colors">
                  {setup.docentes} docentes
                </Link>
              </div>
            </div>
          </div>
        )}

        <GateTicker />

        {/* ── Indicadores del día ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={19} strokeWidth={1.7} />}
            label="Presentes hoy"
            value={String(stats?.presentes ?? '—')}
            denom={String(stats?.totalAlumnos ?? '')}
            note={stats && stats.totalAlumnos > 0
              ? `${((stats.presentes / stats.totalAlumnos) * 100).toFixed(1)}% de asistencia`
              : 'Sin alumnos matriculados'}
            noteTone="ok"
          />
          <StatCard
            icon={<UserX size={19} strokeWidth={1.7} />}
            label="Ausentes"
            value={String(stats?.ausentes ?? '—')}
            note={stats?.ausentes ? 'Registrados hoy' : 'Ninguno hoy'}
            noteTone="bad"
          />
          <StatCard
            icon={<Clock size={19} strokeWidth={1.7} />}
            label="Tardanzas"
            value={String(stats?.tardanzas ?? '—')}
            note={stats?.tardanzas ? 'Ingresaron fuera de hora' : 'Ninguna hoy'}
            noteTone="warn"
          />
          <StatCard
            icon={<Presentation size={19} strokeWidth={1.7} />}
            label="Docentes activos"
            value={String(stats?.docentesActivos ?? '—')}
            denom={String(stats?.docentesTotal ?? '')}
            note={stats ? `${stats.docentesTotal - stats.docentesActivos} sin actividad` : ''}
            noteTone="neutral"
          />
        </div>

        {/* ── Semana + Próximos eventos ── */}
        <div className="grid xl:grid-cols-[1.6fr_1fr] gap-4">
          <div className="card p-6">
            <PanelHead
              title="Asistencia de la semana"
              sub="Entradas registradas por RFID"
              right={<span className="label-mono">{rangoSemana}</span>}
            />
            <div className="grid grid-cols-7 mt-6">
              {(stats?.semana ?? []).map((d, i) => {
                const futuro = d.fecha > hoyIso;
                return (
                  <div key={d.fecha} className={cn('text-center py-2', i > 0 && 'border-l border-line')}>
                    <div className="label-mono">{d.diaCorto}</div>
                    <div className={cn('mt-2 text-[24px] font-bold tracking-tight', futuro && 'text-ink-3 font-medium')}>
                      {futuro ? '—' : d.entradas}
                    </div>
                    <div className="text-[10.5px] text-ink-3 mt-0.5">Entradas</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-line flex items-center justify-between">
              <span className="text-[12px] text-ink-3">
                {mejorDia
                  ? <>Mejor día: <b className="text-ink font-semibold">{mejorDia.diaCorto} ({mejorDia.entradas})</b></>
                  : 'Aún no hay entradas registradas esta semana'}
              </span>
              {stats && <Pill tone="ok">{stats.comunicadosPublicados} comunicados publicados</Pill>}
            </div>
          </div>

          <div className="card p-6">
            <PanelHead title="Próximos eventos" sub="Calendario institucional" right={<CalendarDays size={16} className="text-ink-3" />} />
            {/* TODO: módulo de eventos pendiente de diseño (tabla, permisos de creación). */}
            <p className="text-[12.5px] text-ink-3 py-6 text-center">Aún no hay eventos programados.</p>
          </div>
        </div>

        {/* ── Comunicados + Cumpleaños + Apoderados web ── */}
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="card p-6">
            <PanelHead title="Comunicados recientes" right={<Megaphone size={16} className="text-ink-3" />} />
            {comunicados.length === 0 ? (
              <p className="text-[12.5px] text-ink-3 py-6 text-center">Aún no hay comunicados publicados.</p>
            ) : (
              <div className="space-y-4">
                {comunicados.map(c => (
                  <div key={c.id} className="group cursor-pointer">
                    <p className="text-[12.5px] font-semibold group-hover:text-brand transition-colors">{c.titulo}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Mono className="!text-[10.5px]">{c.autor} · {c.publicadoEn}</Mono>
                      {c.destinatarios > 0 && (
                        <span className="text-[11px] text-ink-3">{c.lecturas}/{c.destinatarios} leídos</span>
                      )}
                    </div>
                    {c.destinatarios > 0 && (
                      <div className="mt-1.5 h-1 rounded-full bg-canvas overflow-hidden">
                        <div className="h-full bg-brand/70 rounded-full" style={{ width: `${Math.min(100, (c.lecturas / c.destinatarios) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <PanelHead title="Cumpleaños de hoy" right={<Cake size={16} className="text-ink-3" />} />
            {cumples.length === 0 ? (
              <p className="text-[12.5px] text-ink-3 py-6 text-center">Hoy nadie está de cumpleaños.</p>
            ) : (
              <div className="space-y-3">
                {cumples.map(a => (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold truncate">{a.nombres} {a.apellidos}</p>
                      <Mono className="!text-[10.5px]">{a.grado} "{a.seccion}" · {a.codigo}</Mono>
                    </div>
                    <button className="grid place-items-center w-8 h-8 rounded-[9px] bg-brand-soft text-brand hover:bg-brand hover:text-white transition-colors cursor-pointer" title="Enviar saludo al apoderado">
                      <Bell size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <PanelHead title="Familias conectadas" sub="Apoderados con cuenta web activa" right={<HeartHandshake size={16} className="text-ink-3" />} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold tracking-tight">{stats?.apoderadosConCuenta ?? '—'}</span>
              <span className="text-[14px] text-ink-3 font-medium">/{stats?.apoderadosTotal ?? 0}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-canvas overflow-hidden">
              <div className="h-full bg-ok rounded-full transition-[width] duration-700" style={{ width: `${porcentajeFamilias}%` }} />
            </div>
            <p className="mt-3 text-[12px] text-ink-2">
              {stats && stats.apoderadosTotal > 0
                ? <><b className="font-semibold">{porcentajeFamilias}%</b> de los apoderados ya recibe avisos de entrada y salida.</>
                : 'Aún no hay apoderados registrados.'}
            </p>
            {stats && stats.apoderadosTotal > stats.apoderadosConCuenta && (
              <p className="mt-4 text-[12px] text-ink-3">
                {stats.apoderadosTotal - stats.apoderadosConCuenta} apoderados sin activar su cuenta.
              </p>
            )}
          </div>
        </div>

        {/* ── Actividad reciente ── */}
        <div className="card p-6">
          <PanelHead title="Actividad reciente" right={<Bell size={16} className="text-ink-3" />} />
          {actividad.length === 0 ? (
            <p className="text-[12.5px] text-ink-3 py-6 text-center">Aún no hay actividad reciente.</p>
          ) : (
            <div>
              {actividad.map((a, i) => (
                <div key={a.id} className={cn('flex items-center gap-3.5 py-3 cursor-pointer group', i > 0 && 'border-t border-line')}>
                  <Avatar nombre={a.texto} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] truncate">
                      <b className="font-semibold">{a.texto.split(' ').slice(0, 2).join(' ')}</b>{' '}
                      {a.texto.split(' ').slice(2).join(' ')}
                    </p>
                    <Mono className="!text-[10.5px]">{a.detalle} · {a.hora}</Mono>
                  </div>
                  <ChevronRight size={15} className="text-ink-3 group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
