import { useEffect, useRef, useState } from 'react';
import { Search, CreditCard, Loader2, CheckCircle2, AlertTriangle, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Avatar, Mono, cn } from '../../components/ui';
import { claseInput } from '../../components/Modal';
import {
  getAulas, getAlumnos, vincularTarjetaAlumno, abrirCanalVinculacion,
} from '../../services/api';
import type { Alumno, Aula, TarjetaSinAsignarEvento } from '../../types';

/** "hace X segundos" en vivo, sin depender de una librería de fechas. */
function tiempoRelativo(iso: string, ahoraMs: number): string {
  const segundos = Math.max(0, Math.round((ahoraMs - new Date(iso).getTime()) / 1000));
  if (segundos < 5) return 'justo ahora';
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  return `hace ${minutos} min`;
}

export default function VincularTarjetas() {
  const [tarjetaPendiente, setTarjetaPendiente] = useState<TarjetaSinAsignarEvento | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [conectado, setConectado] = useState(false);

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [aulaId, setAulaId] = useState<number | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Alumno[]>([]);
  const [buscando, setBuscando] = useState(false);

  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reloj para el "hace X segundos" de la tarjeta pendiente
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { getAulas().then(setAulas).catch(() => {}); }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Canal en vivo: solo mientras esta pantalla está abierta se difunden las
  // tarjetas sin dueño (ver AsistenciaService en el backend).
  useEffect(() => {
    const cerrar = abrirCanalVinculacion(
      evento => {
        setTarjetaPendiente(evento);
        setErrorAsignacion(null);
        setMensajeExito(null);
      },
      () => setConectado(false),
    );
    setConectado(true);
    return () => cerrar();
  }, []);

  // Búsqueda con retardo, mientras se escribe (2+ letras) o al elegir un aula.
  //
  // Con texto escrito: se busca en TODO el alumnado, tenga o no tarjeta ya
  // asignada — filtrar en silencio a quien ya tiene tarjeta hacía parecer
  // roto el buscador ("no encuentro a nadie"). Cada resultado deja claro su
  // estado (ver más abajo) y solo los que de verdad están sin tarjeta se
  // pueden confirmar con un clic.
  //
  // Sin texto y con un aula elegida: sigue mostrando solo a los pendientes
  // de esa aula — es el "quién falta" de un vistazo, y ahí sí es lo que se
  // quiere ver.
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 2 && !aulaId) { setResultados([]); return; }
    const t = setTimeout(() => {
      setBuscando(true);
      getAlumnos(q || undefined, { aulaId: aulaId || undefined, sinTarjeta: q.length < 2 })
        .then(setResultados)
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [busqueda, aulaId]);

  async function confirmar(alumno: Alumno) {
    if (!tarjetaPendiente || asignandoId) return;
    setAsignandoId(alumno.id);
    setErrorAsignacion(null);
    try {
      await vincularTarjetaAlumno(alumno.id, tarjetaPendiente.uid);
      setMensajeExito(`Tarjeta asignada a ${alumno.nombres} ${alumno.apellidos}`);
      setTarjetaPendiente(null);
      setBusqueda('');
      setResultados([]);
      inputRef.current?.focus();
      setTimeout(() => setMensajeExito(null), 3000);
    } catch (e) {
      setErrorAsignacion(e instanceof Error ? e.message : 'No se pudo asignar la tarjeta');
    } finally {
      setAsignandoId(null);
    }
  }

  const hayFiltro = busqueda.trim().length >= 2 || aulaId !== '';

  return (
    <>
      <Topbar
        title="Vincular tarjetas"
        subtitle="Acerca cada tarjeta al lector y asígnala con un clic"
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[640px] mx-auto space-y-4">

        <div className="flex justify-center">
          <span className={cn('inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[12.5px] font-semibold',
            conectado ? 'border-ok/30 bg-ok-soft text-ok' : 'border-line bg-canvas text-ink-3')}>
            {conectado ? <Wifi size={13} /> : <WifiOff size={13} />}
            {conectado ? 'Lector conectado' : 'Sin conexión al canal'}
          </span>
        </div>

        {/* ── Última tarjeta detectada ── */}
        <div className="card p-6 sm:p-8 text-center animate-rise">
          {tarjetaPendiente ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft text-warn px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-warn dot-live" /> Sin asignar
              </span>
              <p className="font-mono text-[30px] sm:text-[36px] font-bold tracking-tight mt-3 break-all">
                {tarjetaPendiente.uid}
              </p>
              <p className="text-[12.5px] text-ink-3 mt-1">{tiempoRelativo(tarjetaPendiente.detectadoEn, ahora)}</p>
            </>
          ) : (
            <>
              <span className="inline-grid place-items-center w-14 h-14 rounded-full bg-canvas text-ink-3 mb-3">
                <CreditCard size={24} />
              </span>
              <p className="font-semibold text-[15px]">Esperando que acerquen una tarjeta…</p>
              <p className="text-[12.5px] text-ink-3 mt-1">Pide al estudiante que la acerque al lector</p>
            </>
          )}
        </div>

        {mensajeExito && (
          <div className="card p-4 border-ok/30 bg-ok-soft/40 flex items-center gap-2.5 animate-rise">
            <CheckCircle2 size={16} className="text-ok shrink-0" />
            <p className="text-[13px] text-ok font-semibold">{mensajeExito}</p>
          </div>
        )}
        {errorAsignacion && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40 flex items-center gap-2.5 animate-rise">
            <AlertTriangle size={16} className="text-bad shrink-0" />
            <p className="text-[13px] text-bad font-medium">{errorAsignacion}</p>
          </div>
        )}

        {/* ── Filtro de aula + buscador ── */}
        <div className="card p-4 sm:p-5 space-y-3">
          {aulas.length > 0 && (
            <select
              value={aulaId}
              onChange={e => setAulaId(e.target.value ? Number(e.target.value) : '')}
              className={claseInput}
            >
              <option value="">Todo el colegio</option>
              {aulas.map(a => (
                <option key={a.id} value={a.id}>{a.etiqueta} · {a.nivel.toLowerCase()}</option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              ref={inputRef}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar estudiante por nombre o código…"
              className="w-full rounded-[10px] border border-line bg-paper pl-10 pr-3.5 py-3 text-[15px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
            />
          </div>
        </div>

        {/* ── Resultados ── */}
        {!hayFiltro ? (
          <p className="text-center text-[12px] text-ink-3 py-2">
            Escribe al menos 2 letras, o elige un aula para ver su lista.
          </p>
        ) : buscando ? (
          <div className="card p-8 grid place-items-center text-ink-3">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : resultados.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[13px] text-ink-3">Ningún estudiante coincide con la búsqueda</p>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-line">
            {!tarjetaPendiente && resultados.some(a => !a.tarjetaRfid) && (
              <p className="px-4 sm:px-5 py-2.5 text-[11.5px] text-ink-3 bg-canvas">
                Acerca una tarjeta al lector antes de poder asignarla
              </p>
            )}
            {resultados.map(a => {
              const tieneTarjeta = !!a.tarjetaRfid;
              const clicable = !tieneTarjeta && !!tarjetaPendiente && asignandoId === null;
              return (
                <button
                  key={a.id}
                  onClick={() => confirmar(a)}
                  disabled={!clicable}
                  className={cn(
                    'flex w-full items-center gap-3.5 px-4 sm:px-5 py-3.5 text-left transition-colors',
                    clicable ? 'hover:bg-canvas active:bg-brand-faint cursor-pointer' : 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13.5px] truncate">{a.nombres} {a.apellidos}</p>
                    {tieneTarjeta ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-warn">
                        <CreditCard size={11} /> Ya tiene tarjeta: {a.tarjetaRfid}
                      </span>
                    ) : (
                      <Mono className="!text-[10.5px]">{a.codigo} · {a.grado} "{a.seccion}"</Mono>
                    )}
                  </div>
                  {asignandoId === a.id ? (
                    <Loader2 size={16} className="animate-spin text-brand shrink-0" />
                  ) : tieneTarjeta ? (
                    <span className="text-[11px] font-semibold text-ink-3 shrink-0">Ver</span>
                  ) : (
                    <ChevronRight size={16} className="text-ink-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </>
  );
}
