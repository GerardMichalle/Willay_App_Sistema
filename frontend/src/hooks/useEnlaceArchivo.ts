import { useEffect, useState } from 'react';
import { getEnlaceArchivo, uuidDeRutaArchivo } from '../services/api';

/**
 * Resuelve una ruta de archivo protegido ("/api/archivos/{uuid}") a un
 * enlace firmado listo para <img src>. El enlace expira en minutos, así
 * que se resuelve de nuevo en cada montaje en vez de guardarse en sesión.
 */
export function useEnlaceArchivo(ruta: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ruta) { setUrl(null); return; }
    let vigente = true;
    getEnlaceArchivo(uuidDeRutaArchivo(ruta))
      .then(u => { if (vigente) setUrl(u); })
      .catch(() => { if (vigente) setUrl(null); });
    return () => { vigente = false; };
  }, [ruta]);
  return url;
}
