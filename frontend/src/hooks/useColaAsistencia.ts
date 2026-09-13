import { useCallback, useEffect, useState } from 'react';
import { simularLectura } from '../services/api';
import type { LecturaVivo } from '../types';

interface LecturaPendiente {
  id: string;
  tarjeta: string;
  apiKey: string;
  metodo: string;
  creadaEn: number;
}

const CLAVE = 'willay-cola-asistencia';

function leerCola(): LecturaPendiente[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as LecturaPendiente[]; } catch { return []; }
}
function guardarCola(cola: LecturaPendiente[]) {
  localStorage.setItem(CLAVE, JSON.stringify(cola));
}

/**
 * fetch() rechaza con TypeError cuando la petición nunca llegó a tener
 * respuesta (sin red, DNS caído, CORS bloqueado) — a diferencia de un
 * error de negocio real (QR vencido, tarjeta no encontrada), que sí llega
 * a una respuesta del servidor y se lanza como Error normal más abajo en
 * simularLectura(). Solo el primer caso tiene sentido reintentar después;
 * el segundo se queda igual de mal aunque vuelva la conexión.
 */
function esErrorDeRed(e: unknown): boolean {
  return e instanceof TypeError;
}

/**
 * Cola de lecturas de asistencia (Escanear QR) que no se pudieron mandar
 * por falta de conexión: se guardan en el celular y se reintentan solas
 * apenas vuelve internet, en el mismo orden en que se escanearon.
 */
export function useColaAsistencia(alSincronizarUna: (l: LecturaVivo) => void) {
  const [pendientes, setPendientes] = useState<LecturaPendiente[]>(() => leerCola());
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizar = useCallback(async () => {
    const cola = leerCola();
    if (cola.length === 0) return;
    setSincronizando(true);
    const restantes: LecturaPendiente[] = [];
    for (const item of cola) {
      try {
        const resultado = await simularLectura(item.tarjeta, item.apiKey, item.metodo);
        alSincronizarUna(resultado);
      } catch (e) {
        if (esErrorDeRed(e)) restantes.push(item);
        // error de negocio real: se descarta, reintentar no lo va a arreglar
      }
    }
    guardarCola(restantes);
    setPendientes(restantes);
    setSincronizando(false);
  }, [alSincronizarUna]);

  useEffect(() => {
    window.addEventListener('online', () => { void sincronizar(); });
    if (navigator.onLine) void sincronizar(); // por si ya hay cola guardada de una sesión anterior
    return () => window.removeEventListener('online', sincronizar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Intenta mandar la lectura de una; si falla por red, la guarda para reintentar en vez de perderla. */
  const registrar = useCallback(async (
    tarjeta: string, apiKey: string, metodo: string,
  ): Promise<{ estado: 'enviada'; resultado: LecturaVivo } | { estado: 'guardada-offline' }> => {
    try {
      const resultado = await simularLectura(tarjeta, apiKey, metodo);
      return { estado: 'enviada', resultado };
    } catch (e) {
      if (!esErrorDeRed(e)) throw e; // error de negocio real: que lo maneje quien llamó
      const item: LecturaPendiente = { id: crypto.randomUUID(), tarjeta, apiKey, metodo, creadaEn: Date.now() };
      const cola = [...leerCola(), item];
      guardarCola(cola);
      setPendientes(cola);
      return { estado: 'guardada-offline' };
    }
  }, []);

  return { cantidadPendiente: pendientes.length, sincronizando, registrar };
}
