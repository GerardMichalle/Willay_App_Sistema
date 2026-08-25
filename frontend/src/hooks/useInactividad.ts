import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Estilo banca: sin ninguna interacción real (mouse, teclado, toque), la
 * sesión se cierra sola por seguridad — es realista que una laptop quede
 * abierta sin vigilancia en la secretaría de un colegio. Para ajustar los
 * tiempos, basta con cambiar estas dos constantes.
 */
const MINUTOS_ANTES_DE_AVISAR = 15;
const SEGUNDOS_DE_GRACIA = 60;

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
/** No hace falta registrar cada pixel de movimiento: alcanza con esta frecuencia. */
const THROTTLE_MS = 2000;

/**
 * Monta el reloj de inactividad mientras haya sesión (se usa solo dentro de
 * AppLayout, que no existe en /login ni /activar). Devuelve lo necesario
 * para que el layout muestre la advertencia — el hook no dibuja nada.
 */
export function useInactividad() {
  const { cerrar } = useAuth();
  const toast = useToast();
  const [advertencia, setAdvertencia] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_DE_GRACIA);

  const ultimaActividad = useRef(Date.now());
  const ultimoRegistro = useRef(Date.now());
  /** No-null solo mientras la advertencia está activa: instante en que se cierra la sesión. */
  const finGracia = useRef<number | null>(null);

  const seguirConectado = useCallback(() => {
    ultimaActividad.current = Date.now();
    ultimoRegistro.current = Date.now();
    finGracia.current = null;
    setAdvertencia(false);
    setSegundosRestantes(SEGUNDOS_DE_GRACIA);
  }, []);

  useEffect(() => {
    function alHaberActividad() {
      const ahora = Date.now();
      if (ahora - ultimoRegistro.current < THROTTLE_MS) return;
      ultimoRegistro.current = ahora;
      ultimaActividad.current = ahora;
      // Cualquier interacción mientras la advertencia está visible cancela el cierre.
      if (finGracia.current !== null) {
        finGracia.current = null;
        setAdvertencia(false);
        setSegundosRestantes(SEGUNDOS_DE_GRACIA);
      }
    }

    EVENTOS_ACTIVIDAD.forEach(ev => window.addEventListener(ev, alHaberActividad, { passive: true }));

    const intervalo = setInterval(() => {
      const ahora = Date.now();
      if (finGracia.current === null) {
        if (ahora - ultimaActividad.current >= MINUTOS_ANTES_DE_AVISAR * 60_000) {
          finGracia.current = ahora + SEGUNDOS_DE_GRACIA * 1000;
          setAdvertencia(true);
          setSegundosRestantes(SEGUNDOS_DE_GRACIA);
        }
        return;
      }
      const restantes = Math.max(0, Math.ceil((finGracia.current - ahora) / 1000));
      setSegundosRestantes(restantes);
      if (restantes <= 0) {
        toast('Tu sesión se cerró por inactividad', 'info');
        cerrar();
      }
    }, 1000);

    return () => {
      EVENTOS_ACTIVIDAD.forEach(ev => window.removeEventListener(ev, alHaberActividad));
      clearInterval(intervalo);
    };
  }, [cerrar, toast]);

  return { advertencia, segundosRestantes, seguirConectado };
}
