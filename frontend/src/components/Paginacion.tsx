import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Mono } from './ui';

/** Controles de anterior/siguiente + "Página X de Y", reutilizados en todos los listados paginados. */
export default function Paginacion({ pagina, totalPaginas, onCambiar }: {
  pagina: number; totalPaginas: number; onCambiar: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onCambiar(Math.max(0, pagina - 1))}
        disabled={pagina === 0}
        className="grid place-items-center w-8 h-8 rounded-[8px] border border-line text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft size={15} />
      </button>
      <Mono className="!text-[12px]">Página {pagina + 1} de {totalPaginas}</Mono>
      <button
        onClick={() => onCambiar(Math.min(totalPaginas - 1, pagina + 1))}
        disabled={pagina >= totalPaginas - 1}
        className="grid place-items-center w-8 h-8 rounded-[8px] border border-line text-ink-2 hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
