import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, LogIn, LogOut, Megaphone, BookOpen, Award, Sparkles, Loader2,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { PanelHead, Mono, Pill, Avatar, cn } from '../../components/ui';
import { getAlumnos, getLibretas, getConductaApi, getComunicadosApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno, LibretaApi, ConductaApi, ComunicadoApi } from '../../types';

export default function InicioPadre() {
  const { usuario } = useAuth();
  const [hijos, setHijos] = useState<Alumno[]>([]);
  const [libretas, setLibretas] = useState<LibretaApi[]>([]);
  const [conducta, setConducta] = useState<ConductaApi[]>([]);
  const [comunicados, setComunicados] = useState<ComunicadoApi[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getAlumnos().then(setHijos),
      getLibretas().then(setLibretas),
      getConductaApi().then(setConducta),
      getComunicadosApi().then(c => setComunicados(c.filter(x => x.publicado).slice(0, 3))),
    ]).finally(() => setCargando(false));
  }, []);

  const primerNombre = usuario?.nombre.split(' ')[0] ?? '';
  const hijo = hijos[0];
  const ultimaLibreta = libretas[0];
  const ultimaConducta = conducta[0];

  if (cargando) {
    return (
      <>
        <Topbar title={`Hola, ${primerNombre}`} subtitle="Cargando…" />
        <div className="px-4 sm:px-8 pb-10">
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        </div>
      </>
    );
  }

  if (!hijo) {
    return (
      <>
        <Topbar title={`Hola, ${primerNombre}`} subtitle="Resumen familiar" />
        <div className="px-4 sm:px-8 pb-10 max-w-[1100px]">
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Todavía no hay estudiantes vinculados a tu cuenta</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[400px] mx-auto">
              Comunícate con la secretaría del colegio para que verifiquen tu vínculo familiar.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={`Hola, ${primerNombre}`}
        subtitle={`Resumen de ${hijo.nombres} · ${hijo.grado} "${hijo.seccion}"`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {/* Estado ahora: lo primero que un padre quiere saber */}
        {hijos.map(h => {
          const dentro = h.entradaHoy != null && h.salidaHoy == null;
          return (
            <div key={h.id} className="card p-6 flex flex-wrap items-center gap-5">
              <span className="relative">
                <Avatar nombre={`${h.nombres} ${h.apellidos}`} size="lg" />
                <span className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-paper',
                  dentro ? 'bg-ok' : 'bg-ink-3')} />
              </span>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[17px] font-bold tracking-tight">
                    {h.nombres} {dentro ? 'está en el colegio' : h.salidaHoy ? 'ya salió del colegio' : 'aún no registra ingreso'}
                  </h2>
                  {h.entradaHoy && (
                    <Pill tone={h.estadoHoy === 'tardanza' ? 'warn' : 'ok'}>
                      <LogIn size={11} /> Ingresó {h.entradaHoy}
                    </Pill>
                  )}
                  {h.salidaHoy && <Pill tone="neutral"><LogOut size={11} /> Salió {h.salidaHoy}</Pill>}
                </div>
                <Mono className="!text-[11px] mt-1 block">
                  HOY · {h.grado} "{h.seccion}" · {h.tarjetaRfid ? `TARJETA ${h.tarjetaRfid}` : 'SIN TARJETA ASIGNADA'}
                </Mono>
              </div>
              <Link to="/asistencia/historial"
                className="text-[12px] font-semibold text-brand hover:text-brand-strong transition-colors">
                Ver asistencia →
              </Link>
            </div>
          );
        })}

        <div className="grid xl:grid-cols-2 gap-4">
          <div className="card p-6">
            <PanelHead title="Libreta de notas" right={<BookOpen size={16} className="text-ink-3" />} />
            {ultimaLibreta ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={cn('text-[26px] font-bold tracking-tight',
                    (ultimaLibreta.promedio ?? 0) >= 14 ? 'text-ok' : 'text-warn')}>
                    {ultimaLibreta.promedio?.toFixed(2) ?? '—'}
                  </span>
                  <span className="text-[12.5px] text-ink-3">promedio · {ultimaLibreta.periodo}</span>
                </div>
                <p className="text-[12px] text-ink-2 mt-1.5">
                  Publicada el {ultimaLibreta.publicadaEn} · {ultimaLibreta.notas.length} cursos
                </p>
                <Link to="/libreta" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong transition-colors">
                  Ver libreta completa <ArrowRight size={13} />
                </Link>
              </>
            ) : (
              <p className="text-[12.5px] text-ink-3">Aún no hay libretas publicadas para este periodo.</p>
            )}
          </div>

          <div className="card p-6">
            <PanelHead title="Conducta" right={<Award size={16} className="text-ink-3" />} />
            {ultimaConducta ? (
              <>
                <p className="text-[12.5px]">
                  <b className={cn('font-semibold', ultimaConducta.tipo === 'MERITO' ? 'text-ok' : 'text-warn')}>
                    {ultimaConducta.tipo === 'MERITO' ? 'Mérito' : 'Observación'}:
                  </b>{' '}
                  {ultimaConducta.descripcion}
                </p>
                <Mono className="!text-[10.5px] mt-1 block">
                  {ultimaConducta.fecha} · {ultimaConducta.registradoPor}
                </Mono>
              </>
            ) : (
              <p className="text-[12.5px] text-ink-3">Sin registros de conducta.</p>
            )}
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-4">
          <div className="card p-6">
            <PanelHead title="Comunicados" right={<Megaphone size={16} className="text-ink-3" />} />
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
                    <ArrowRight size={14} className="text-ink-3 group-hover:text-brand transition-all group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/cursos" className="card p-6 flex items-center gap-4 hover:border-line-2 transition-colors">
            <span className="grid place-items-center w-11 h-11 rounded-[12px] bg-brand-soft text-brand shrink-0">
              <Sparkles size={19} />
            </span>
            <div className="flex-1">
              <p className="text-[13.5px] font-bold">Cursos gratuitos para la familia</p>
              <p className="text-[12px] text-ink-2 mt-0.5">Material de educación financiera para aprender en casa.</p>
            </div>
            <ArrowRight size={15} className="text-brand shrink-0" />
          </Link>
        </div>
      </div>
    </>
  );
}
