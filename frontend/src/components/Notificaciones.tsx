import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, LogIn, LogOut, Megaphone, Flag, BookOpen, Loader2, X, Trash2 } from 'lucide-react';
import {
  getNotificaciones, getNoLeidas, marcarNotificacionLeida, marcarNotificacionesLeidas,
  eliminarNotificacion, eliminarNotificaciones,
} from '../services/api';
import { Mono, cn } from './ui';
import { useConfirm } from '../context/ConfirmContext';
import type { NotificacionApi } from '../types';

const ICONO: Record<string, React.ReactNode> = {
  INGRESO_HIJO: <LogIn size={13} />,
  SALIDA_HIJO: <LogOut size={13} />,
  COMUNICADO: <Megaphone size={13} />,
  AVISO_PLATAFORMA: <Megaphone size={13} />,
  CONDUCTA: <Flag size={13} />,
  LIBRETA: <BookOpen size={13} />,
};

const TONO: Record<string, string> = {
  INGRESO_HIJO: 'bg-ok-soft text-ok',
  SALIDA_HIJO: 'bg-info-soft text-info',
  COMUNICADO: 'bg-brand-soft text-brand',
  AVISO_PLATAFORMA: 'bg-info-soft text-info',
  CONDUCTA: 'bg-warn-soft text-warn',
  LIBRETA: 'bg-info-soft text-info',
};

/**
 * A dónde navegar al hacer clic, según el tipo. AVISO_PLATAFORMA (el aviso
 * global del Superadmin a los administradores) queda deliberadamente fuera:
 * no corresponde a ningún Comunicado real de un colegio, así que solo se
 * marca como leído, sin navegar a ningún lado.
 */
const RUTA_POR_TIPO: Record<string, string> = {
  INGRESO_HIJO: '/asistencia/historial',
  SALIDA_HIJO: '/asistencia/historial',
  COMUNICADO: '/comunicados',
  CONDUCTA: '/conducta',
  LIBRETA: '/libreta',
};

/** Categorías del filtro: agrupan tipos afines para no exigir un tipo exacto por pestaña. */
const CATEGORIAS: { etiqueta: string; tipos?: string[] }[] = [
  { etiqueta: 'Todas' },
  { etiqueta: 'Asistencia', tipos: ['INGRESO_HIJO', 'SALIDA_HIJO'] },
  { etiqueta: 'Comunicados', tipos: ['COMUNICADO', 'AVISO_PLATAFORMA'] },
  { etiqueta: 'Conducta', tipos: ['CONDUCTA'] },
  { etiqueta: 'Libretas', tipos: ['LIBRETA'] },
];

/** Campana del encabezado: consulta periódicamente los avisos del usuario. */
export default function Notificaciones() {
  const nav = useNavigate();
  const confirmar = useConfirm();
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState<NotificacionApi[]>([]);
  const [categoria, setCategoria] = useState(CATEGORIAS[0].etiqueta);
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

  const cargar = async (etiqueta: string) => {
    setCargando(true);
    try {
      const tipos = CATEGORIAS.find(c => c.etiqueta === etiqueta)?.tipos;
      setLista(await getNotificaciones(tipos));
    } catch { /* sin conexión */ } finally {
      setCargando(false);
    }
  };

  async function alternar() {
    const nuevo = !abierto;
    setAbierto(nuevo);
    if (nuevo) await cargar(categoria);
  }

  function cambiarCategoria(etiqueta: string) {
    setCategoria(etiqueta);
    void cargar(etiqueta);
  }

  async function leerTodas() {
    await marcarNotificacionesLeidas();
    setSinLeer(0);
    setLista(l => l.map(n => ({ ...n, leida: true })));
  }

  /** e.stopPropagation(): el botón vive dentro de la fila clicable, no debe navegar. */
  async function eliminar(e: React.MouseEvent, n: NotificacionApi) {
    e.stopPropagation();
    try {
      await eliminarNotificacion(n.id);
      setLista(l => l.filter(x => x.id !== n.id));
      if (!n.leida) setSinLeer(s => Math.max(0, s - 1));
    } catch { /* si falla, se queda en la lista y se puede reintentar */ }
  }

  async function eliminarTodas() {
    const ok = await confirmar({
      titulo: 'Borrar todas las notificaciones',
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Borrar todas',
    });
    if (!ok) return;
    try {
      await eliminarNotificaciones();
      setLista([]);
      setSinLeer(0);
    } catch { /* sin conexión: se queda como estaba */ }
  }

  /** Marca la individual como leída (si hacía falta) y navega, salvo AVISO_PLATAFORMA. */
  async function alClicNotificacion(n: NotificacionApi) {
    if (!n.leida) {
      try {
        await marcarNotificacionLeida(n.id);
        setLista(l => l.map(x => x.id === n.id ? { ...x, leida: true } : x));
        setSinLeer(s => Math.max(0, s - 1));
      } catch { /* si falla, igual navega: no vale la pena bloquear al usuario por esto */ }
    }
    const ruta = RUTA_POR_TIPO[n.tipo];
    if (ruta) {
      setAbierto(false);
      nav(ruta);
    }
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
          <div className="px-4 py-3 border-b border-line space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-bold tracking-tight">Notificaciones</p>
              <div className="flex items-center gap-3">
                {sinLeer > 0 && (
                  <button onClick={leerTodas}
                    className="flex items-center gap-1 text-[11.5px] font-semibold text-brand hover:text-brand-strong cursor-pointer">
                    <Check size={12} /> Marcar leídas
                  </button>
                )}
                {lista.length > 0 && (
                  <button onClick={eliminarTodas}
                    className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-3 hover:text-bad cursor-pointer">
                    <Trash2 size={12} /> Borrar todas
                  </button>
                )}
              </div>
            </div>
            <select
              value={categoria}
              onChange={e => cambiarCategoria(e.target.value)}
              className="w-full rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-[11.5px] text-ink-2 outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
            >
              {CATEGORIAS.map(c => <option key={c.etiqueta} value={c.etiqueta}>{c.etiqueta}</option>)}
            </select>
          </div>

          <div className="overflow-y-auto scroll-thin flex-1">
            {cargando ? (
              <div className="py-10 grid place-items-center text-ink-3"><Loader2 size={18} className="animate-spin" /></div>
            ) : lista.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-ink-3">No tienes notificaciones</p>
            ) : (
              lista.map(n => (
                <div key={n.id}
                  onClick={() => void alClicNotificacion(n)}
                  className={cn('flex gap-3 px-4 py-3 border-b border-line last:border-0 transition-colors cursor-pointer hover:bg-canvas',
                    !n.leida && 'bg-brand-faint hover:bg-brand-faint')}>
                  <span className={cn('grid place-items-center w-7 h-7 rounded-full shrink-0',
                    TONO[n.tipo] ?? 'bg-canvas text-ink-3')}>
                    {ICONO[n.tipo] ?? <Bell size={13} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold leading-snug">{n.titulo}</p>
                    {n.cuerpo && <p className="text-[11.5px] text-ink-2 mt-0.5 leading-snug">{n.cuerpo}</p>}
                    <Mono className="!text-[10px] mt-1 block">{n.cuando}</Mono>
                  </div>
                  <button onClick={e => void eliminar(e, n)} title="Eliminar"
                    className="shrink-0 self-start grid place-items-center w-6 h-6 rounded-full text-ink-3 hover:bg-bad-soft hover:text-bad transition-colors cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
