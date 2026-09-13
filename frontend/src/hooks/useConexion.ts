import { useEffect, useRef, useState } from 'react';
import { getSaludSistema } from '../services/api';

/**
 * navigator.onLine + los eventos online/offline solo reflejan si el
 * dispositivo tiene ALGUNA interfaz de red activa — si sigues conectado a
 * un WiFi que ya no tiene salida a internet, el navegador igual dice
 * "conectado". Por eso, además de esos eventos (para reaccionar al
 * instante si el SO apaga el WiFi/datos del todo), se le pregunta de
 * verdad al backend cada cierto tiempo.
 */
const INTERVALO_MS = 15_000;

/**
 * Estado de conexión real, para mostrar un aviso único y consistente en
 * todas las pantallas (antes cada una manejaba la desconexión por su
 * cuenta: algunas con un mensaje rojo, otras en silencio — el usuario no
 * sabía si "no hay datos" o "se cortó internet"). Se usa solo dentro de
 * AppLayout, que no existe en /login ni /activar.
 */
export function useConexion(): boolean {
  const [conectado, setConectado] = useState(true);
  const enCurso = useRef(false);

  useEffect(() => {
    let vivo = true;

    async function verificar() {
      if (enCurso.current) return;
      enCurso.current = true;
      const ok = await getSaludSistema().catch(() => false);
      if (vivo) setConectado(ok);
      enCurso.current = false;
    }

    void verificar();
    const id = setInterval(() => { void verificar(); }, INTERVALO_MS);

    const alDesconectar = () => { if (vivo) setConectado(false); };
    const alConectar = () => { void verificar(); };
    window.addEventListener('offline', alDesconectar);
    window.addEventListener('online', alConectar);

    return () => {
      vivo = false;
      clearInterval(id);
      window.removeEventListener('offline', alDesconectar);
      window.removeEventListener('online', alConectar);
    };
  }, []);

  return conectado;
}
