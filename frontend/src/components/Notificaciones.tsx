import { useEffect, useRef, useState } from 'react';
import { Bell, Check, LogIn, LogOut, Megaphone, Flag, BookOpen, Loader2 } from 'lucide-react';
import { getNotificaciones, getNoLeidas, marcarNotificacionesLeidas } from '../services/api';
import { Mono, cn } from './ui';
import type { NotificacionApi } from '../types';

const ICONO: Record<string, React.ReactNode> = {
  INGRESO_HIJO: <LogIn size={13} />,
  SALIDA_HIJO: <LogOut size={13} />,
  COMUNICADO: <Megaphone size={13} />,
  CONDUCTA: <Flag size={13} />,
  LIBRETA: <BookOpen size={13} />,
};

const TONO: Record<string, string> = {
  INGRESO_HIJO: 'bg-ok-soft text-ok',
  SALIDA_HIJO: 'bg-info-soft text-info',
  COMUNICADO: 'bg-brand-soft text-brand',
  CONDUCTA: 'bg-warn-soft text-warn',
  LIBRETA: 'bg-info-soft text-info',
};

/** Campana del encabezado: consulta periódicamente los avisos del usuario. */
export default function Notificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<NotificacionApi[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [cargando, setCargando] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Sondeo cada 45 s: suficiente para avisos y sin coste apreciable
  useEffect(() => {
    let vivo = true;
    const consultar = () => { getNoLeidas().then(n => { if (vivo) setSinLeer(n); }).catch(() => {}); };
    consultar();
    const id = setInterval(consultar, 45_000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const alClic = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  async function alternar() {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (!nuevo) return;
    setCargando(true);
    try {
      setLista(await getNotificaciones());
    } catch { /* sin conexión */ } finally {
      setCargando(false);
    }
  }

  async function leerTodas() {
    await marcarNotificacionesLeidas();
    setSinLeer(0);
    setLista(l => l.map(n => ({ ...n, leida: true })));
  }

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={alternar}
        className="relative grid place-items-center w-10 h-10 rounded-[10px] border border-line bg-paper text-ink-2 hover:text-ink transition-colors cursor-pointer"
        aria-label="Notificaciones"
      >
        <Bell size={16} />
        {sinLeer > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 grid place-items-center rounded-full bg-brand text-white text-[9.5px] font-bold">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 z-50 w-[330px] max-h-[420px] flex flex-col rounded-[14px] border border-line bg-paper shadow-2xl animate-rise overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-[13.5px] font-bold tracking-tight">Notificaciones</p>
            {sinLeer > 0 && (
              <button onClick={leerTodas}
                className="flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:text-brand-strong cursor-pointer">
                <Check size={12} /> Marcar leídas
              </button>
            )}
          </div>

          <div className="overflow-y-auto scroll-thin flex-1">
            {cargando ? (
              <div className="py-10 grid place-items-center text-ink-3"><Loader2 size={18} className="animate-spin" /></div>
            ) : lista.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-ink-3">No tienes notificaciones</p>
            ) : (
              lista.map(n => (
                <div key={n.id}
                  className={cn('flex gap-3 px-4 py-3 border-b border-line last:border-0 transition-colors',
                    !n.leida && 'bg-brand-faint')}>
                  <span className={cn('grid place-items-center w-7 h-7 rounded-full shrink-0',
                    TONO[n.tipo] ?? 'bg-canvas text-ink-3')}>
                    {ICONO[n.tipo] ?? <Bell size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold leading-snug">{n.titulo}</p>
                    {n.cuerpo && <p className="text-[11.5px] text-ink-2 mt-0.5 leading-snug">{n.cuerpo}</p>}
                    <Mono className="!text-[10px] mt-1 block">{n.cuando}</Mono>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
