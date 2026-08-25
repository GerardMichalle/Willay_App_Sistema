import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Clock } from 'lucide-react';
import Sidebar, { LogoWillay } from '../components/Sidebar';
import Modal from '../components/Modal';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useInactividad } from '../hooks/useInactividad';

export default function AppLayout() {
  const { usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const ubicacion = useLocation();
  const { advertencia, segundosRestantes, seguirConectado } = useInactividad();

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

      <Modal
        abierto={advertencia}
        titulo="Tu sesión está por cerrarse"
        onCerrar={seguirConectado}
        pie={<Button onClick={seguirConectado}>Seguir conectado</Button>}
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-full bg-bad-soft text-bad shrink-0">
            <Clock size={18} />
          </div>
          <p className="text-[13px] text-ink-2 leading-relaxed">
            Por seguridad, tu sesión se cerrará en{' '}
            <span className="font-bold text-ink">{segundosRestantes} segundos</span> por inactividad.
          </p>
        </div>
      </Modal>
    </div>
  );
}
