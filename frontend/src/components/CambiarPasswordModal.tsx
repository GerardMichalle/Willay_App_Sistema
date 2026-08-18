import { useState } from 'react';
import { Eye, EyeOff, Loader2, Check, CheckCircle2 } from 'lucide-react';
import Modal, { Campo, claseInput } from './Modal';
import { Button } from './ui';
import { cambiarPasswordPropia } from '../services/api';

function CampoPassword({ valor, onChange, visible, onAlternar, autoFocus, onEnter }: {
  valor: string; onChange: (v: string) => void; visible: boolean; onAlternar: () => void;
  autoFocus?: boolean; onEnter?: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={valor}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className={`${claseInput} pr-11`}
      />
      <button
        type="button"
        onClick={onAlternar}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default function CambiarPasswordModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function limpiarYCerrar() {
    setActual(''); setNueva(''); setConfirmar('');
    setVerActual(false); setVerNueva(false); setVerConfirmar(false);
    setError(null); setExito(false);
    onCerrar();
  }

  const coinciden = confirmar !== '' && nueva === confirmar;
  const formValido = actual.trim() !== '' && nueva.length >= 8 && coinciden;

  async function guardar() {
    if (!formValido || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      await cambiarPasswordPropia(actual, nueva);
      setExito(true);
      setTimeout(limpiarYCerrar, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      titulo="Cambiar contraseña"
      subtitulo="Usa una contraseña de al menos 8 caracteres"
      onCerrar={limpiarYCerrar}
      pie={!exito ? (
        <>
          <Button variant="ghost" onClick={limpiarYCerrar}>Cancelar</Button>
          <Button onClick={guardar} disabled={!formValido || guardando}>
            {guardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Guardar
          </Button>
        </>
      ) : undefined}
    >
      {exito ? (
        <div className="py-6 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-full bg-ok-soft text-ok mb-3">
            <CheckCircle2 size={22} />
          </span>
          <p className="text-[13.5px] font-semibold">Tu contraseña se actualizó correctamente</p>
        </div>
      ) : (
        <>
          {error && (
            <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{error}</p>
          )}

          <Campo etiqueta="Contraseña actual" requerido>
            <CampoPassword valor={actual} onChange={setActual} visible={verActual}
              onAlternar={() => setVerActual(v => !v)} autoFocus />
          </Campo>

          <Campo etiqueta="Nueva contraseña" requerido>
            <CampoPassword valor={nueva} onChange={setNueva} visible={verNueva}
              onAlternar={() => setVerNueva(v => !v)} />
            <p className="text-[11px] text-ink-3 mt-1.5">Mínimo 8 caracteres.</p>
          </Campo>

          <Campo etiqueta="Confirmar nueva contraseña" requerido
            error={confirmar !== '' && !coinciden ? 'No coincide con la nueva contraseña' : undefined}>
            <CampoPassword valor={confirmar} onChange={setConfirmar} visible={verConfirmar}
              onAlternar={() => setVerConfirmar(v => !v)} onEnter={guardar} />
          </Campo>
        </>
      )}
    </Modal>
  );
}
