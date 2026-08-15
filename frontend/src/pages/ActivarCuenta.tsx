import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, ShieldCheck, KeyRound, Loader2,
  CheckCircle2, Eye, EyeOff, PartyPopper,
} from 'lucide-react';
import { LogoWillay } from '../components/Sidebar';
import { Avatar, Mono, Pill, cn } from '../components/ui';
import { verificarActivacion, completarActivacion, type IdentidadActivacion } from '../services/api';

type Paso = 'codigo' | 'contrasena' | 'listo';

/**
 * Activación de cuenta (alumnos y apoderados).
 * El colegio entrega un código de 6 dígitos al matricular. El usuario NO elige
 * su rol ni su vínculo: el sistema lo reconoce por el código + DNI.
 *
 * TODO Spring Boot:
 *   POST /api/activacion/verificar  { codigo, dni } → { nombre, rol, vinculo }
 *   POST /api/activacion/completar  { codigo, dni, password } → { token }
 * El código expira a los 30 días y solo puede usarse una vez.
 */
export default function ActivarCuenta() {
  const nav = useNavigate();
  const [paso, setPaso] = useState<Paso>('codigo');
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(''));
  const [dni, setDni] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [activando, setActivando] = useState(false);
  const [identidad, setIdentidad] = useState<IdentidadActivacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const codigoCompleto = digitos.every(d => d !== '');
  const dniValido = /^\d{8}$/.test(dni);
  const fuerza = [pass.length >= 8, /[A-ZÁÉÍÓÚ]/.test(pass), /\d/.test(pass)].filter(Boolean).length;
  const coincide = pass2.length > 0 && pass === pass2;

  function escribirDigito(i: number, v: string) {
    const limpio = v.replace(/\D/g, '').slice(-1);
    const nuevos = [...digitos];
    nuevos[i] = limpio;
    setDigitos(nuevos);
    if (limpio && i < 5) refs.current[i + 1]?.focus();
  }
  function teclaDigito(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) refs.current[i - 1]?.focus();
  }
  function pegarCodigo(e: React.ClipboardEvent) {
    const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (txt.length) {
      e.preventDefault();
      setDigitos(Array.from({ length: 6 }, (_, i) => txt[i] ?? ''));
      refs.current[Math.min(txt.length, 5)]?.focus();
    }
  }

  async function verificar() {
    setError(null);
    setVerificando(true);
    try {
      // Verificación real: el backend valida el código + DNI y revela la identidad
      const id = await verificarActivacion(digitos.join(''), dni);
      setIdentidad(id);
      setPaso('contrasena');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo verificar el código');
    } finally {
      setVerificando(false);
    }
  }
  async function activar() {
    setError(null);
    setActivando(true);
    try {
      await completarActivacion(digitos.join(''), dni, pass);
      setPaso('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar la cuenta');
    } finally {
      setActivando(false);
    }
  }

  const ROL_LABEL: Record<string, string> = {
    APODERADO: 'Apoderado', ALUMNO: 'Estudiante', DOCENTE: 'Docente',
    DIRECCION: 'Dirección', ADMIN: 'Administrador',
  };
  const primerNombre = identidad?.nombreCompleto.split(' ')[0] ?? '';

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4 relative overflow-hidden">
      {/* marca de agua: tarjetas RFID flotando */}
      <div className="absolute inset-0 pointer-events-none opacity-[.035]" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-40 h-24 rounded-2xl border-2 border-ink"
            style={{ top: `${(i * 37) % 90}%`, left: `${(i * 53 + 8) % 92}%`, transform: `rotate(${i % 2 ? 14 : -12}deg)` }}
          />
        ))}
      </div>

      <div className="w-full max-w-[420px] animate-rise">
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-2.5">
            <LogoWillay size={34} />
            <span className="text-[28px] font-bold tracking-tight">Willay</span>
          </div>
          <p className="label-mono mt-2">Activación de cuenta</p>
        </div>

        <div className="card p-7 shadow-[0_10px_40px_rgba(0,0,0,.06)] overflow-hidden">

          {/* Indicador de pasos */}
          {paso !== 'listo' && (
            <div className="flex items-center gap-2 mb-6">
              {(['codigo', 'contrasena'] as Paso[]).map((p, i) => {
                const activo = paso === p;
                const hecho = paso === 'contrasena' && p === 'codigo';
                return (
                  <div key={p} className="flex items-center gap-2 flex-1">
                    <span className={cn(
                      'grid place-items-center w-6 h-6 rounded-full text-[11px] font-bold transition-all duration-300',
                      hecho ? 'bg-ok text-white' : activo ? 'bg-brand text-white scale-110' : 'bg-canvas text-ink-3 border border-line',
                    )}>
                      {hecho ? '✓' : i + 1}
                    </span>
                    <span className={cn('text-[11.5px] font-semibold transition-colors', activo || hecho ? 'text-ink' : 'text-ink-3')}>
                      {p === 'codigo' ? 'Tu código' : 'Tu contraseña'}
                    </span>
                    {i === 0 && <span className={cn('flex-1 h-[2px] rounded-full transition-colors duration-500', hecho ? 'bg-ok' : 'bg-line')} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PASO 1: código + DNI ── */}
          {paso === 'codigo' && (
            <div className="animate-fade-slide">
              <h1 className="text-[18px] font-bold tracking-tight">Activa tu cuenta</h1>
              <p className="text-[12.5px] text-ink-3 mt-1 mb-5">
                Ingresa el código de 6 dígitos que te entregó el colegio junto con tu DNI. El sistema te reconocerá automáticamente.
              </p>

              <div className="label-mono mb-2">Código de activación</div>
              <div className="flex gap-2 mb-5" onPaste={pegarCodigo}>
                {digitos.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { refs.current[i] = el; }}
                    value={d}
                    onChange={e => escribirDigito(i, e.target.value)}
                    onKeyDown={e => teclaDigito(i, e)}
                    inputMode="numeric"
                    className={cn(
                      'w-full aspect-[0.85] text-center text-[20px] font-bold font-mono rounded-[10px] border bg-paper outline-none transition-all duration-200',
                      d ? 'border-brand bg-brand-faint scale-[1.03]' : 'border-line focus:border-brand focus:ring-[3px] focus:ring-brand-soft',
                    )}
                  />
                ))}
              </div>

              <label className="block mb-6">
                <span className="label-mono">DNI del titular</span>
                <input
                  value={dni}
                  onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  inputMode="numeric"
                  placeholder="8 dígitos"
                  className="mt-1.5 w-full rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] font-mono outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
                />
              </label>

              {error && (
                <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{error}</p>
              )}
              <button
                onClick={verificar}
                disabled={!codigoCompleto || !dniValido || verificando}
                className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {verificando ? <Loader2 size={15} className="animate-spin" /> : <>Verificar código <ArrowRight size={15} /></>}
              </button>

              <p className="text-[11.5px] text-ink-3 mt-4 text-center">
                ¿No tienes un código? Pídelo en la secretaría de tu colegio.
              </p>
            </div>
          )}

          {/* ── PASO 2: identidad revelada + contraseña ── */}
          {paso === 'contrasena' && (
            <div className="animate-fade-slide">
              {/* El sistema te reconoció: no eliges rol, ya sabe quién eres */}
              <div className="rounded-[12px] border border-ok/25 bg-ok-soft/50 p-4 animate-pop">
                <div className="flex items-center gap-3">
                  <Avatar nombre={identidad?.nombreCompleto ?? ''} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-ok text-[11px] font-semibold">
                      <CheckCircle2 size={13} /> ¡Te encontramos!
                    </div>
                    <p className="text-[14.5px] font-bold tracking-tight mt-0.5">{identidad?.nombreCompleto}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Pill tone="brand">{ROL_LABEL[identidad?.rol ?? ''] ?? identidad?.rol}</Pill>
                      <Mono className="!text-[10.5px]">{identidad?.vinculo}</Mono>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-ink-3 mt-4 mb-4">
                Solo falta crear tu contraseña. Con ella entrarás a Willay con tu cuenta personal.
              </p>

              <label className="block mb-4">
                <span className="label-mono">Nueva contraseña</span>
                <div className="relative mt-1.5">
                  <input
                    type={verPass ? 'text' : 'password'}
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-[10px] border border-line bg-paper px-3.5 py-2.5 pr-10 text-[13px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
                  />
                  <button
                    onClick={() => setVerPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink transition-colors cursor-pointer"
                    aria-label="Mostrar contraseña"
                  >
                    {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Barra de fuerza animada */}
                <div className="flex gap-1.5 mt-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-500',
                      fuerza > i ? (fuerza === 1 ? 'bg-bad' : fuerza === 2 ? 'bg-warn' : 'bg-ok') : 'bg-line',
                    )} />
                  ))}
                </div>
                <p className="text-[10.5px] text-ink-3 mt-1.5">
                  {fuerza === 0 ? 'Usa 8+ caracteres, una mayúscula y un número.' : fuerza < 3 ? 'Puede ser más fuerte: agrega mayúsculas y números.' : 'Contraseña fuerte ✓'}
                </p>
              </label>

              <label className="block mb-6">
                <span className="label-mono">Repite tu contraseña</span>
                <input
                  type="password"
                  value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  className={cn(
                    'mt-1.5 w-full rounded-[10px] border bg-paper px-3.5 py-2.5 text-[13px] outline-none transition-all focus:ring-[3px]',
                    pass2.length === 0 ? 'border-line focus:border-brand focus:ring-brand-soft'
                      : coincide ? 'border-ok focus:border-ok focus:ring-ok-soft' : 'border-bad focus:border-bad focus:ring-bad-soft',
                  )}
                />
                {pass2.length > 0 && !coincide && <p className="text-[10.5px] text-bad mt-1.5">Las contraseñas no coinciden.</p>}
              </label>

              {error && (
                <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setError(null); setPaso('codigo'); }}
                  className="grid place-items-center w-11 rounded-[10px] border border-line text-ink-2 hover:text-ink hover:border-line-2 transition-colors cursor-pointer"
                  aria-label="Volver"
                >
                  <ArrowLeft size={15} />
                </button>
                <button
                  onClick={activar}
                  disabled={fuerza < 2 || !coincide || activando}
                  className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {activando ? <Loader2 size={15} className="animate-spin" /> : <><KeyRound size={14} /> Activar mi cuenta</>}
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: listo ── */}
          {paso === 'listo' && (
            <div className="text-center py-4 animate-pop">
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-ok-soft text-ok">
                <PartyPopper size={26} />
              </div>
              <h2 className="text-[18px] font-bold tracking-tight mt-4">{`¡Tu cuenta está lista, ${primerNombre}!`}</h2>
              <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[280px] mx-auto">
                Ya puedes iniciar sesión con tu correo y la contraseña que creaste.
              </p>
              <button
                onClick={() => nav('/login')}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] cursor-pointer"
              >
                Iniciar sesión <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>

        {paso !== 'listo' && (
          <p className="text-center mt-5 text-[12.5px] text-ink-3">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand hover:text-brand-strong transition-colors">Inicia sesión</Link>
          </p>
        )}

        <p className="flex items-center justify-center gap-1.5 label-mono mt-4">
          <ShieldCheck size={12} /> Solo el colegio puede emitir códigos
        </p>
      </div>
    </div>
  );
}
