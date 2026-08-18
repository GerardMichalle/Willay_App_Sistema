import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '../types';
import { sesionGuardada, actualizarUsuarioSesion, logout as apiLogout } from '../services/api';

interface AuthCtx {
  usuario: Usuario | null;
  iniciar: (u: Usuario) => void;
  actualizarUsuario: (cambios: Partial<Usuario>) => void;
  cerrar: () => void;
}

const Ctx = createContext<AuthCtx>({ usuario: null, iniciar: () => {}, actualizarUsuario: () => {}, cerrar: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restaura la sesión guardada: al recargar la página sigues dentro.
  const [usuario, setUsuario] = useState<Usuario | null>(() => sesionGuardada()?.usuario ?? null);

  function cerrar() {
    void apiLogout();          // revoca los refresh tokens en el backend
    setUsuario(null);
  }

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
