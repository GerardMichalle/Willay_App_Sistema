import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Sparkles, Megaphone, Flame, BookOpen, IdCard, Award, Loader2, CheckCircle2,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { PanelHead, Mono, Pill, cn } from '../../components/ui';
import { getAlumnos, getLibretas, getConductaApi, getComunicadosApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno, LibretaApi, ConductaApi, ComunicadoApi } from '../../types';

export default function InicioAlumno() {
  const { usuario } = useAuth();
  const [yo, setYo] = useState<Alumno | null>(null);
  const [libretas, setLibretas] = useState<LibretaApi[]>([]);
  const [conducta, setConducta] = useState<ConductaApi[]>([]);
  const [comunicados, setComunicados] = useState<ComunicadoApi[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getAlumnos().then(l => setYo(l[0] ?? null)),
      getLibretas().then(setLibretas),
      getConductaApi().then(setConducta),
      getComunicadosApi().then(c => setComunicados(c.filter(x => x.publicado).slice(0, 3))),
    ]).finally(() => setCargando(false));
  }, []);

  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';
  const ultimaLibreta = libretas[0];
  const meritos = conducta.filter(c => c.tipo === 'MERITO').length;
  const ultimoMerito = conducta.find(c => c.tipo === 'MERITO');

  if (cargando) {
    return (
      <>
        <Topbar title={`¡Hola, ${primerNombre}!`} subtitle="Cargando tu espacio…" />
        <div className="px-4 sm:px-8 pb-10">
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title={`¡Hola, ${primerNombre}!`} subtitle="Este es tu espacio en Willay" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {/* Estado de hoy */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-brand to-[#F2683C] text-white px-7 py-6 relative">
            <div className="absolute inset-0 opacity-[.12]"
              style={{ backgroundImage: 'radial-gradient(circle at 15% 40%, #fff 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }} />
            <div className="relative flex flex-wrap items-center gap-5 justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">Tu ingreso de hoy</div>
                <div className="flex items-center gap-2 mt-1">
                  {yo?.entradaHoy ? <CheckCircle2 size={22} /> : <Flame size={22} />}
                  <span className="text-[30px] font-bold leading-none">
                    {yo?.entradaHoy ?? 'Sin registro'}
                  </span>
                </div>
                <p className="text-[12.5px] text-white/85 mt-2">
                  {yo?.entradaHoy
                    ? yo.estadoHoy === 'tardanza'
                      ? 'Llegaste después de la hora de tolerancia.'
                      : '¡Llegaste puntual! Sigue así.'
                    : 'Pasa tu tarjeta por el lector al entrar al colegio.'}
                </p>
              </div>
              <Link to="/mi-perfil"
                className="flex items-center gap-2 bg-white text-brand rounded-[10px] px-4 py-2.5 text-[13px] font-semibold hover:bg-brand-faint transition-colors">
                <IdCard size={15} /> Ver mi tarjeta y QR
              </Link>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-4">
          <div className="card p-6">
            <PanelHead title="Mis notas" right={<BookOpen size={16} className="text-ink-3" />} />
            {ultimaLibreta ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-[30px] font-bold tracking-tight',
                    (ultimaLibreta.promedio ?? 0) >= 14 ? 'text-ok' : 'text-warn')}>
                    {ultimaLibreta.promedio?.toFixed(1) ?? '—'}
                  </span>
                  <span className="text-[13px] text-ink-3">promedio</span>
                </div>
                <p className="text-[12px] text-ink-2 mt-2">{ultimaLibreta.periodo}</p>
                <Link to="/libreta" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong transition-colors">
                  Ver todas mis notas <ArrowRight size={13} />
                </Link>
              </>
            ) : (
              <p className="text-[12.5px] text-ink-3">Todavía no hay notas publicadas.</p>
            )}
          </div>

          <div className="card p-6">
            <PanelHead title="Mis méritos" right={<Award size={16} className="text-ink-3" />} />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold tracking-tight text-info">{meritos}</span>
              <span className="text-[13px] text-ink-3">{meritos === 1 ? 'reconocimiento' : 'reconocimientos'}</span>
            </div>
            {ultimoMerito ? (
              <p className="text-[12px] text-ink-2 mt-2">{ultimoMerito.categoria}: {ultimoMerito.descripcion}</p>
            ) : (
              <p className="text-[12px] text-ink-3 mt-2">Aún no tienes méritos registrados.</p>
            )}
          </div>

          <div className="card p-6">
            <PanelHead title="Cursos gratuitos" right={<Sparkles size={16} className="text-ink-3" />} />
            <p className="text-[13px] font-semibold">Economía y Finanzas</p>
            <p className="text-[12px] text-ink-2 mt-1">Aprende a ahorrar y hacer crecer tus propinas.</p>
            <Link to="/cursos" className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong transition-colors">
              Explorar <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <PanelHead title="Comunicados para ti" right={<Megaphone size={16} className="text-ink-3" />} />
          {comunicados.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">No hay comunicados publicados.</p>
          ) : (
            <div className="space-y-3">
              {comunicados.map(c => (
                <Link key={c.id} to="/comunicados" className="flex items-center justify-between gap-3 group">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate group-hover:text-brand transition-colors">{c.titulo}</p>
                    <Mono className="!text-[10.5px]">{c.autor} · {c.publicadoEn}</Mono>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!c.leidoPorMi && <Pill tone="brand">Nuevo</Pill>}
                    <ArrowRight size={14} className="text-ink-3 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
