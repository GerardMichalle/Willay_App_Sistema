import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar, { LogoWillay } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();

  // Cierra el cajón al cambiar de ruta y bloquea el scroll del fondo mientras está abierto siuuu
  useEffect(() => { setMenuAbierto(false); }, [ubicacion.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuAbierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuAbierto]);

  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fijo (escritorio) */}
      <Sidebar />

      {/* Cajón deslizante (móvil) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${menuAbierto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuAbierto}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setMenuAbierto(false)} />
        <div className={`absolute inset-y-0 left-0 shadow-2xl transition-transform duration-300 ease-out ${menuAbierto ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar enCajon onNavegar={() => setMenuAbierto(false)} />
        </div>
        <button
          onClick={() => setMenuAbierto(false)}
          className={`absolute top-4 left-[276px] grid place-items-center w-9 h-9 rounded-full bg-paper border border-line text-ink-2 shadow-lg transition-all duration-300 ${menuAbierto ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Cerrar menú"
        >
          <X size={16} />
        </button>
      </div>

      <main className="flex-1 min-w-0">
        {/* Barra superior solo móvil */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 bg-paper/90 backdrop-blur border-b border-line px-4 py-3">
          <button
            onClick={() => setMenuAbierto(true)}
            className="grid place-items-center w-10 h-10 -ml-1.5 rounded-[10px] text-ink-2 hover:bg-canvas active:scale-95 transition-all"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2">
            <LogoWillay size={22} />
            <span className="text-[17px] font-bold tracking-tight">Willay</span>
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
