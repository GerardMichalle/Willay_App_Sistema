import { claseInput } from './Modal';

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
 */
export default function TelefonoInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { codigo, numero } = separar(value ?? '');

  return (
    <div className="flex gap-2">
      <select
        value={codigo}
        onChange={e => onChange(e.target.value + numero)}
        className={`${claseInput} !w-[92px] font-mono !px-2`}
      >
        {PAISES.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
      </select>
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
