import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Diálogo modal del sistema.
 * Cierra con Escape o clic en el fondo, bloquea el scroll y respeta
 * el mismo lenguaje visual que el resto de la interfaz.
 */
export default function Modal({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children,
  pie,
}: {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclear);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = '';
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-[fadeIn_.2s_ease]" onClick={onCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full sm:max-w-[520px] max-h-[92vh] flex flex-col bg-paper rounded-t-[18px] sm:rounded-[16px] border border-line shadow-2xl animate-rise"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight">{titulo}</h2>
            {subtitulo && <p className="text-[12px] text-ink-3 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={onCerrar}
            className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto scroll-thin flex-1">{children}</div>

        {pie && <div className="px-6 py-4 border-t border-line flex justify-end gap-2">{pie}</div>}
      </div>
    </div>
  );
}

/* Campo de formulario con etiqueta y error, coherente con el sistema visual */
export function Campo({
  etiqueta,
  error,
  requerido,
  children,
}: {
  etiqueta: string;
  error?: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block mb-4">
      <span className="label-mono">
        {etiqueta}{requerido && <span className="text-brand"> *</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="text-[11px] text-bad mt-1.5">{error}</p>}
    </label>
  );
}

export const claseInput =
  'w-full rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] outline-none ' +
  'transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft disabled:opacity-50';
