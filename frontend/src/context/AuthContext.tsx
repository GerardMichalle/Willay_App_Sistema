import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Usuario } from '../types';
import { sesionGuardada, actualizarUsuarioSesion, logout as apiLogout } from '../services/api';

interface AuthCtx {
  usuario: Usuario | null;
  iniciar: (u: Usuario) => void;
  actualizarUsuario: (cambios: Partial<Usuario>) => void;
  cerrar: () => void;
}

const Ctx = createContext<AuthCtx>({ usuario: null, iniciar: () => {}, actualizarUsuario: () => {}, cerrar: () => {} });

/**
 * Minutos de inactividad real (sin mouse/teclado/toque) antes de cerrar
 * sesión sola. Coincide con la vida del access token en el backend: pasado
 * este tiempo el token ya habría expirado de todas formas.
 */
const MINUTOS_INACTIVIDAD = 30;
export const CLAVE_AVISO_INACTIVIDAD = 'willay-cierre-por-inactividad';
const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restaura la sesión guardada: al recargar la página sigues dentro.
  const [usuario, setUsuario] = useState<Usuario | null>(() => sesionGuardada()?.usuario ?? null);
  const usuarioRef = useRef(usuario);
  usuarioRef.current = usuario;

  function cerrar() {
    void apiLogout();          // revoca los refresh tokens en el backend
    setUsuario(null);
  }

  // Cierra sola tras MINUTOS_INACTIVIDAD sin ninguna interacción real. Las
  // llamadas de fondo (notificaciones, SSE) no cuentan como actividad: solo
  // lo que el usuario hace con el mouse, teclado o pantalla táctil.
  useEffect(() => {
    if (!usuario) return;

    let temporizador: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (!usuarioRef.current) return;
        sessionStorage.setItem(CLAVE_AVISO_INACTIVIDAD, '1');
        void apiLogout();
        setUsuario(null);
      }, MINUTOS_INACTIVIDAD * 60_000);
    };

    reiniciar();
    EVENTOS_ACTIVIDAD.forEach(ev => window.addEventListener(ev, reiniciar, { passive: true }));
    return () => {
      clearTimeout(temporizador);
      EVENTOS_ACTIVIDAD.forEach(ev => window.removeEventListener(ev, reiniciar));
    };
  }, [usuario]);

  /** Actualiza campos del usuario actual (p. ej. fotoUrl) en memoria y en la sesión persistida. */
  function actualizarUsuario(cambios: Partial<Usuario>) {
    const actualizado = actualizarUsuarioSesion(cambios);
    if (actualizado) setUsuario(actualizado);
  }

  return (
    <Ctx.Provider value={{ usuario, iniciar: setUsuario, actualizarUsuario, cerrar }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
