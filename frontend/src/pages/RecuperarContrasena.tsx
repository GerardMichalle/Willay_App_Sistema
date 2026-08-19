import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Mail, Loader2, CheckCircle2, Eye, EyeOff, PartyPopper,
} from 'lucide-react';
import { LogoWillay } from '../components/Sidebar';
import PanelMarca from '../components/PanelMarca';
import { cn } from '../components/ui';
import { solicitarRecuperacion, completarRecuperacion } from '../services/api';

type Paso = 'correo' | 'codigo' | 'listo';

/**
 * "Olvidé mi contraseña": pide el correo, envía un código de 6 dígitos por
 * email, y con ese código + la contraseña nueva se restablece el acceso.
 * Nunca revela si un correo existe o no en el sistema (mismo mensaje siempre).
 */
export default function RecuperarContrasena() {
  const nav = useNavigate();
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(''));
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [restableciendo, setRestableciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const correoValido = /^\S+@\S+\.\S+$/.test(correo);
  const codigoCompleto = digitos.every(d => d !== '');
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

  async function enviarCorreo() {
    setError(null);
    setEnviando(true);
    try {
      await solicitarRecuperacion(correo.trim());
      setPaso('codigo');
    } catch (e) {
      // Aun con error de red mostramos el mismo paso: nunca confirmamos ni negamos
      // si el correo existe desde este formulario.
      setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  }

  async function restablecer() {
    setError(null);
    setRestableciendo(true);
    try {
      await completarRecuperacion(correo.trim(), digitos.join(''), pass);
      setPaso('listo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo restablecer la contraseña');
    } finally {
      setRestableciendo(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-canvas select-none">
      <PanelMarca />

      <div className="relative flex items-center justify-center px-4 py-10 overflow-hidden">
        <div className="relative z-10 w-full max-w-[360px] animate-rise">
          <div className="flex flex-col items-center mb-7 lg:hidden">
            <div className="flex items-center gap-2.5">
              <LogoWillay size={34} />
              <span className="text-[28px] font-bold tracking-tight">Willay</span>
            </div>
            <p className="label-mono mt-2">Recuperar contraseña</p>
          </div>

          <div className="card p-7 shadow-[0_10px_40px_rgba(0,0,0,.06)] overflow-hidden">
            {paso === 'correo' && (
              <>
                <h1 className="text-[18px] font-bold tracking-tight">¿Olvidaste tu contraseña?</h1>
                <p className="text-[12.5px] text-ink-3 mt-1 mb-5">
                  Escribe el correo de tu cuenta. Si está registrado, te enviaremos un código para crear una contraseña nueva.
                </p>

                <label className="block mb-6">
                  <span className="label-mono">Correo</span>
                  <div className="relative mt-1.5">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                      type="email"
                      value={correo}
                      onChange={e => setCorreo(e.target.value)}
                      maxLength={160}
                      placeholder="tucorreo@gmail.com"
                      className="w-full rounded-[10px] border border-line bg-paper pl-10 pr-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
                    />
                  </div>
                </label>

                {error && (
                  <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{error}</p>
                )}
                <button
                  onClick={enviarCorreo}
                  disabled={!correoValido || enviando}
                  className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <>Enviar código <ArrowRight size={15} /></>}
                </button>
              </>
            )}

            {paso === 'codigo' && (
              <>
                <h1 className="text-[18px] font-bold tracking-tight">Revisa tu correo</h1>
                <p className="text-[12.5px] text-ink-3 mt-1 mb-5">
                  Si <strong className="text-ink-2">{correo}</strong> tiene una cuenta, le llegó un código de 6 dígitos. Ingrésalo junto con tu nueva contraseña.
                </p>

                <div className="label-mono mb-2">Código de recuperación</div>
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
                  <div className="flex gap-1.5 mt-2">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-500',
                        fuerza > i ? (fuerza === 1 ? 'bg-bad' : fuerza === 2 ? 'bg-warn' : 'bg-ok') : 'bg-line',
                      )} />
                    ))}
                  </div>
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
                    onClick={() => { setError(null); setPaso('correo'); }}
                    className="grid place-items-center w-11 rounded-[10px] border border-line text-ink-2 hover:text-ink hover:border-line-2 transition-colors cursor-pointer"
                    aria-label="Volver"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    onClick={restablecer}
                    disabled={!codigoCompleto || fuerza < 2 || !coincide || restableciendo}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {restableciendo ? <Loader2 size={15} className="animate-spin" /> : <><CheckCircle2 size={14} /> Restablecer contraseña</>}
                  </button>
                </div>
              </>
            )}

            {paso === 'listo' && (
              <div className="text-center py-4">
                <div className="mx-auto grid place-items-center w-16 h-16 rounded-full bg-ok-soft text-ok">
                  <PartyPopper size={26} />
                </div>
                <h2 className="text-[18px] font-bold tracking-tight mt-4">¡Contraseña actualizada!</h2>
                <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[280px] mx-auto">
                  Ya puedes iniciar sesión con tu correo y tu nueva contraseña.
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
              ¿Ya la recordaste?{' '}
              <Link to="/login" className="font-semibold text-brand hover:text-brand-strong transition-colors">Inicia sesión</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
