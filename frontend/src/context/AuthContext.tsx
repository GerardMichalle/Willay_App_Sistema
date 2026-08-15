import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '../types';
import { sesionGuardada, logout as apiLogout } from '../services/api';

interface AuthCtx {
  usuario: Usuario | null;
  iniciar: (u: Usuario) => void;
  cerrar: () => void;
}

const Ctx = createContext<AuthCtx>({ usuario: null, iniciar: () => {}, cerrar: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restaura la sesión guardada: al recargar la página sigues dentro.
  const [usuario, setUsuario] = useState<Usuario | null>(() => sesionGuardada()?.usuario ?? null);

  function cerrar() {
    void apiLogout();          // revoca los refresh tokens en el backend
    setUsuario(null);
  }

  return (
    <Ctx.Provider value={{ usuario, iniciar: setUsuario, cerrar }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
