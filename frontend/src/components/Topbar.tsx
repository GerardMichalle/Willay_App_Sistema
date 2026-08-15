import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Notificaciones from './Notificaciones';
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

  /** El buscador lleva al módulo donde ese término tiene sentido para el rol. */
  function buscar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || !busqueda.trim()) return;
    const destino = usuario?.rol === 'admin' || usuario?.rol === 'direccion'
      ? '/alumnos'
      : usuario?.rol === 'profesor' ? '/asistencia/historial' : '/comunicados';
    nav(destino);
    setBusqueda('');
  }
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
        {usuario && <Avatar nombre={usuario.nombre} size="lg" />}
      </div>
    </header>
  );
}
