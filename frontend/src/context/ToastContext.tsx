import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: number;
  mensaje: string;
  tono: 'error' | 'info';
}

type ToastFn = (mensaje: string, tono?: 'error' | 'info') => void;

const Ctx = createContext<ToastFn>(() => {});

const DURACION_MS = 5000;

/**
 * Reemplazo de window.alert() para errores y avisos cortos: aparece abajo a
 * la derecha y se cierra solo. No sirve para datos que hay que copiar (un
 * código, una clave) — esos casos usan un modal aparte que no se cierra solo.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const quitar = useCallback((id: number) => {
    setToasts(actuales => actuales.filter(t => t.id !== id));
  }, []);

  const mostrar = useCallback<ToastFn>((mensaje, tono = 'error') => {
    const id = ++idRef.current;
    setToasts(actuales => [...actuales, { id, mensaje, tono }]);
    setTimeout(() => quitar(id), DURACION_MS);
  }, [quitar]);

  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 w-[min(360px,calc(100vw-2.5rem))]">
        {toasts.map(t => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-start gap-2.5 rounded-[12px] border shadow-lg px-4 py-3 animate-fade-slide bg-paper ${
              t.tono === 'error' ? 'border-bad/30' : 'border-info/30'
            }`}
          >
            {t.tono === 'error'
              ? <AlertCircle size={16} className="text-bad shrink-0 mt-0.5" />
              : <Info size={16} className="text-info shrink-0 mt-0.5" />}
            <p className="text-[12.5px] text-ink-2 flex-1 leading-snug">{t.mensaje}</p>
            <button
              onClick={() => quitar(t.id)}
              className="grid place-items-center w-5 h-5 rounded-md text-ink-3 hover:text-ink shrink-0 cursor-pointer"
              aria-label="Cerrar"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
