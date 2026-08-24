import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { claseInput } from './Modal';
import Bandera from './banderas';

/** Códigos de país más usados por los colegios de Willay. Ampliar esta lista alcanza. */
const PAISES = [
  { codigo: '+51', nombre: 'Perú' },
  { codigo: '+57', nombre: 'Colombia' },
  { codigo: '+56', nombre: 'Chile' },
  { codigo: '+593', nombre: 'Ecuador' },
  { codigo: '+591', nombre: 'Bolivia' },
  { codigo: '+54', nombre: 'Argentina' },
  { codigo: '+55', nombre: 'Brasil' },
  { codigo: '+52', nombre: 'México' },
  { codigo: '+34', nombre: 'España' },
  { codigo: '+1', nombre: 'Estados Unidos' },
] as const;

const CODIGO_DEFECTO = '+51';
const MAX_DIGITOS = 12;

/** Separa "+51987654321" en { codigo: "+51", numero: "987654321" }.
 *  Si el valor guardado no trae código (datos antiguos), asume Perú. */
function separar(valor: string): { codigo: string; numero: string } {
  const pais = PAISES.find(p => valor.startsWith(p.codigo));
  if (pais) return { codigo: pais.codigo, numero: valor.slice(pais.codigo.length) };
  return { codigo: CODIGO_DEFECTO, numero: valor.replace(/\D/g, '') };
}

/**
 * Teléfono con selector de código de país. Guarda un único string
 * "+51987654321" para no tocar el esquema del backend (sigue siendo un
 * VARCHAR de texto libre), pero en pantalla se edita como dos campos.
 *
 * El selector de país es un desplegable propio, no un <select> nativo: un
 * <option> solo admite texto plano, así que no hay forma de mostrar la
 * bandera (ni como SVG ni como emoji) dentro de uno. Se dibuja con un
 * portal a document.body porque este campo suele vivir dentro de un modal
 * con scroll propio, que si no recortaría la lista a la mitad.
 */
export default function TelefonoInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { codigo, numero } = separar(value ?? '');
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });
  const botonRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const actualizarPosicion = () => {
      const r = botonRef.current?.getBoundingClientRect();
      if (r) setPosicion({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    actualizarPosicion();

    const alClic = (e: MouseEvent) => {
      const objetivo = e.target as Node;
      if (botonRef.current?.contains(objetivo) || listaRef.current?.contains(objetivo)) return;
      setAbierto(false);
    };
    const alEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    // El scroll de la propia lista desplegable también llega aquí (fase de
    // captura, los eventos de scroll no burbujean pero sí se capturan) — si
    // no se excluye, la lista se cierra apenas el usuario intenta bajar por
    // ella. Solo cierra ante un scroll fuera de la lista.
    const alScroll = (e: Event) => {
      if (listaRef.current?.contains(e.target as Node)) return;
      setAbierto(false);
    };

    document.addEventListener('mousedown', alClic);
    document.addEventListener('keydown', alEscape);
    window.addEventListener('scroll', alScroll, { capture: true });
    window.addEventListener('resize', actualizarPosicion);
    return () => {
      document.removeEventListener('mousedown', alClic);
      document.removeEventListener('keydown', alEscape);
      window.removeEventListener('scroll', alScroll, { capture: true });
      window.removeEventListener('resize', actualizarPosicion);
    };
  }, [abierto]);

  return (
    <div className="flex gap-2">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(v => !v)}
        className={`${claseInput} !w-[92px] !px-2 flex items-center gap-1.5 cursor-pointer shrink-0`}
      >
        <Bandera codigo={codigo} />
        <span className="font-mono text-[12.5px] flex-1 text-left">{codigo}</span>
        <ChevronDown size={13} className="text-ink-3 shrink-0" />
      </button>

      {abierto && createPortal(
        <div
          ref={listaRef}
          role="listbox"
          style={{ position: 'fixed', top: posicion.top, left: posicion.left, minWidth: Math.max(posicion.width, 190) }}
          className="z-[100] max-h-[260px] overflow-y-auto scroll-thin rounded-[12px] border border-line bg-paper shadow-2xl animate-rise py-1.5"
        >
          {PAISES.map(p => (
            <button
              key={p.codigo}
              type="button"
              role="option"
              aria-selected={p.codigo === codigo}
              onClick={() => { onChange(p.codigo + numero); setAbierto(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-[12.5px] transition-colors cursor-pointer ${
                p.codigo === codigo ? 'bg-brand-soft text-brand font-semibold' : 'text-ink-2 hover:bg-canvas'
              }`}
            >
              <Bandera codigo={p.codigo} />
              <span className="flex-1 text-left truncate">{p.nombre}</span>
              <span className="font-mono text-ink-3">{p.codigo}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}

      <input
        className={`${claseInput} font-mono`}
        inputMode="numeric"
        value={numero}
        onChange={e => onChange(codigo + e.target.value.replace(/\D/g, '').slice(0, MAX_DIGITOS))}
        placeholder={placeholder}
      />
    </div>
  );
}
