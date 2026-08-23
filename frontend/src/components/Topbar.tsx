import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, KeyRound, Camera, Loader2, Bell, BellOff, BellRing } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Notificaciones from './Notificaciones';
import CambiarPasswordModal from './CambiarPasswordModal';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui';
import { subirFotoPerfil, getClavePublicaPush, suscribirPush, desuscribirPush } from '../services/api';
import type { Rol } from '../types';

/**
 * Roles habilitados para cambiar su foto desde este menú. El alumno queda
 * fuera porque ya tiene su propio selector de foto en "Mi perfil".
 */
const ROLES_CON_FOTO: Rol[] = ['admin', 'superadmin', 'direccion', 'profesor', 'apoderado'];

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

/** iOS/iPadOS: Safari (y cualquier navegador ahí, todos corren su motor)
 *  solo entrega push si la web está instalada en la pantalla de inicio. */
function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}
function esInstaladaComoApp() {
  type NavegadorConStandalone = Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as NavegadorConStandalone).standalone === true;
}

/** El navegador soporta la API, pero en iOS sin instalar no sirve de nada intentarlo. */
function pushDisponibleAqui(): 'ok' | 'sin-soporte' | 'ios-sin-instalar' {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'sin-soporte';
  }
  if (esIOS() && !esInstaladaComoApp()) return 'ios-sin-instalar';
  return 'ok';
}

/** PushManager.subscribe() exige la clave VAPID como bytes, no como el string base64url que da el backend. */
function comoClaveVapid(base64url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = window.atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { usuario, actualizarUsuario } = useAuth();
  const nav = useNavigate();
  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [passwordAbierto, setPasswordAbierto] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [soportePush] = useState(pushDisponibleAqui);
  const [pushActivo, setPushActivo] = useState(false);
  const [cargandoPush, setCargandoPush] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  async function cambiarFoto(archivo: File | null) {
    if (!archivo) return;
    setSubiendoFoto(true);
    try {
      const rutaCruda = await subirFotoPerfil(archivo);
      actualizarUsuario({ fotoUrl: rutaCruda });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setSubiendoFoto(false);
    }
  }

  // Al cargar, revisa si este navegador ya tiene una suscripción activa
  // (por ejemplo, se activó ayer y hoy solo se está recargando la página).
  useEffect(() => {
    if (soportePush !== 'ok') return;
    navigator.serviceWorker.getRegistration('/sw.js')
      .then(reg => reg?.pushManager.getSubscription())
      .then(sub => setPushActivo(!!sub))
      .catch(() => {});
  }, [soportePush]);

  async function activarPush() {
    setCargandoPush(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        alert('No diste permiso para las notificaciones. Puedes activarlo luego desde los ajustes del navegador.');
        return;
      }
      const registro = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const clavePublica = await getClavePublicaPush();
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: comoClaveVapid(clavePublica),
      });
      await suscribirPush(suscripcion.toJSON() as PushSubscriptionJSON);
      setPushActivo(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudieron activar las notificaciones');
    } finally {
      setCargandoPush(false);
    }
  }

  async function desactivarPush() {
    setCargandoPush(true);
    try {
      const registro = await navigator.serviceWorker.getRegistration('/sw.js');
      const suscripcion = await registro?.pushManager.getSubscription();
      if (suscripcion) {
        await desuscribirPush(suscripcion.endpoint);
        await suscripcion.unsubscribe();
      }
      setPushActivo(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudieron desactivar las notificaciones');
    } finally {
      setCargandoPush(false);
    }
  }

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
              className="relative rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              aria-label="Cuenta"
            >
              <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} size="lg" />
              {subiendoFoto && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white">
                  <Loader2 size={16} className="animate-spin" />
                </span>
              )}
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
                {ROLES_CON_FOTO.includes(usuario.rol) && (
                  <button
                    onClick={() => { setMenuAbierto(false); archivoRef.current?.click(); }}
                    disabled={subiendoFoto}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-canvas hover:text-ink transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Camera size={14} /> Cambiar foto de perfil
                  </button>
                )}

                {soportePush === 'ok' ? (
                  <button
                    onClick={() => { void (pushActivo ? desactivarPush() : activarPush()); }}
                    disabled={cargandoPush}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-canvas hover:text-ink transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {cargandoPush ? <Loader2 size={14} className="animate-spin" />
                      : pushActivo ? <BellRing size={14} className="text-ok" /> : <Bell size={14} />}
                    {pushActivo ? 'Notificaciones activadas' : 'Activar notificaciones'}
                  </button>
                ) : (
                  <div className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink-3">
                      <BellOff size={14} /> Notificaciones no disponibles
                    </div>
                    <p className="text-[10.5px] text-ink-3 mt-1 pl-[23px] leading-snug">
                      {soportePush === 'ios-sin-instalar'
                        ? 'En iPhone/iPad, instala Willay en tu pantalla de inicio para activarlas.'
                        : 'Tu navegador no admite notificaciones del sistema.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { void cambiarFoto(e.target.files?.[0] ?? null); e.target.value = ''; }} />
          </div>
        )}
      </div>

      <CambiarPasswordModal abierto={passwordAbierto} onCerrar={() => setPasswordAbierto(false)} />
    </header>
  );
}
