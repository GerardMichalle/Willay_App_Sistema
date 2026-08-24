import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Modal from '../components/Modal';
import { Button } from '../components/ui';

interface OpcionesConfirm {
  titulo: string;
  mensaje?: string;
  textoConfirmar?: string;
}

type ConfirmFn = (opciones: OpcionesConfirm) => Promise<boolean>;

const Ctx = createContext<ConfirmFn>(async () => false);

/**
 * Reemplazo de window.confirm() con el mismo estilo visual del resto del
 * sistema. Se usa como `if (!(await confirmar({ titulo, mensaje }))) return;`
 * — misma forma de uso que el confirm() nativo, pero como Promise.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opciones, setOpciones] = useState<OpcionesConfirm | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | undefined>(undefined);

  const confirmar = useCallback<ConfirmFn>(opts => {
    setOpciones(opts);
    return new Promise<boolean>(resolve => { resolverRef.current = resolve; });
  }, []);

  function responder(v: boolean) {
    resolverRef.current?.(v);
    setOpciones(null);
  }

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      <Modal
        abierto={!!opciones}
        titulo={opciones?.titulo ?? ''}
        onCerrar={() => responder(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => responder(false)}>Cancelar</Button>
            <Button onClick={() => responder(true)}>{opciones?.textoConfirmar ?? 'Confirmar'}</Button>
          </>
        }
      >
        {opciones?.mensaje && <p className="text-[13px] text-ink-2 whitespace-pre-line">{opciones.mensaje}</p>}
      </Modal>
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
