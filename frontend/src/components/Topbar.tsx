import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, KeyRound } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Notificaciones from './Notificaciones';
import CambiarPasswordModal from './CambiarPasswordModal';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';

function fechaLarga() {
  const f = new Date();
  const s = f.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const h = f.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  return `${s.charAt(0).toUpperCase() + s.slice(1)} · ${h}`;
}

const PLACEHOLDER: Record<string, string> = {
  admin: 'Buscar alumno, código o DNI…',
  direccion: 'Buscar alumno, código o DNI…',
  profesor: 'Buscar en mi aula…',
  alumno: 'Buscar en Willay…',
  apoderado: 'Buscar en Willay…',
};

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { usuario } = useAuth();
  const nav = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [passwordAbierto, setPasswordAbierto] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  /** El buscador lleva al módulo donde ese término tiene sentido para el rol. */
  function buscar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !busqueda.trim()) return;
    const destino = usuario?.rol === 'admin' || usuario?.rol === 'direccion'
      ? '/alumnos'
      : usuario?.rol === 'profesor' ? '/asistencia/historial' : '/comunicados';
    nav(destino);
    setBusqueda('');
  }

  useEffect(() => {
    if (!menuAbierto) return;
    const alClic = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [menuAbierto]);

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-8 pt-5 sm:pt-6 pb-5">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-tight truncate">{title}</h1>
        <p className="text-[12.5px] text-ink-3 mt-0.5">{subtitle ?? fechaLarga()}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <label className="hidden md:flex items-center gap-2 bg-paper border border-line rounded-[10px] px-3.5 py-2.5 w-[260px] transition-colors focus-within:border-line-2">
          <Search size={15} className="text-ink-3" />
          <input
            placeholder={PLACEHOLDER[usuario?.rol ?? 'admin']}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={buscar}
            className="w-full bg-transparent outline-none text-[13px] placeholder:text-ink-3"
          />
        </label>
        <ThemeToggle />
        <Notificaciones />
        {usuario && (
          <div className="relative" ref={menu}>
            <button
              onClick={() => setMenuAbierto(v => !v)}
              className="rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Cuenta"
            >
              <Avatar nombre={usuario.nombre} size="lg" />
            </button>

            {menuAbierto && (
              <div className="absolute right-0 top-13 z-50 w-[230px] rounded-[14px] border border-line bg-paper shadow-2xl animate-rise overflow-hidden">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-[12.5px] font-semibold truncate">{usuario.nombre}</p>
                  <p className="text-[11px] text-ink-3 truncate">{usuario.correo}</p>
                </div>
                <button
                  onClick={() => { setMenuAbierto(false); setPasswordAbierto(true); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
                >
                  <KeyRound size={14} /> Cambiar contraseña
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <CambiarPasswordModal abierto={passwordAbierto} onCerrar={() => setPasswordAbierto(false)} />
    </header>
  );
}
