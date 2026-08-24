import { useState } from 'react';
import { KeyRound, Copy, Check } from 'lucide-react';
import Modal from './Modal';
import { Button, Mono } from './ui';

/**
 * Muestra un código de activación recién generado, con botón de copiar.
 * A diferencia de un toast, no se cierra solo: es un dato que hay que
 * copiar y entregar, perderlo obligaría a generar uno nuevo.
 */
export default function CodigoActivacionModal({
  abierto,
  nombre,
  codigo,
  onCerrar,
}: {
  abierto: boolean;
  nombre: string;
  codigo: string;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard?.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Nuevo código de activación"
      subtitulo={nombre}
      onCerrar={onCerrar}
      pie={<Button onClick={onCerrar}>Ya lo copié</Button>}
    >
      <div className="rounded-[12px] border border-line p-4">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-brand shrink-0" />
          <Mono className="!text-[13px] font-bold !text-ink break-all flex-1 tracking-widest">{codigo}</Mono>
          <button
            onClick={copiar}
            className={`grid place-items-center w-8 h-8 rounded-[9px] transition-all cursor-pointer shrink-0 ${
              copiado ? 'text-ok bg-ok-soft scale-110' : 'text-ink-3 hover:text-ink hover:bg-canvas'
            }`}
            title="Copiar"
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <p className="text-[12px] text-ink-3 mt-4">
        {copiado ? '¡Copiado! Compártelo con la persona para que active su cuenta.' : 'Compártelo con la persona para que active su cuenta.'}
      </p>
    </Modal>
  );
}
