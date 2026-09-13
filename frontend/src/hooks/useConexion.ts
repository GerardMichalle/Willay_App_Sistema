import { useEffect, useState } from 'react';

/**
 * Estado de conexión a internet del dispositivo, para mostrar un aviso
 * único y consistente en todas las pantallas (antes cada una manejaba la
 * desconexión por su cuenta: algunas con un mensaje rojo, otras en
 * silencio — el usuario no sabía si "no hay datos" o "se cortó internet").
 * Se usa solo dentro de AppLayout, que no existe en /login ni /activar.
 */
export function useConexion(): boolean {
  const [conectado, setConectado] = useState(navigator.onLine);

  useEffect(() => {
    const alConectar = () => setConectado(true);
    const alDesconectar = () => setConectado(false);
    window.addEventListener('online', alConectar);
    window.addEventListener('offline', alDesconectar);
    return () => {
      window.removeEventListener('online', alConectar);
      window.removeEventListener('offline', alDesconectar);
    };
  }, []);

  return conectado;
}
