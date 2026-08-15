import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Users, Pencil, BookOpen, GraduationCap, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogoWillay } from '../components/Sidebar';
import { cn } from '../components/ui';
import type { Rol } from '../types';

/** Solo existen en el entorno de desarrollo local (npm run dev). */
const ROLES: { id: Rol; label: string; icon: React.ReactNode; correo: string }[] = [
  { id: 'direccion', label: 'Dirección', icon: <BarChart3 size={15} />, correo: 'direccion@sanmartin.edu.pe' },
  { id: 'admin', label: 'Administrador', icon: <Users size={15} />, correo: 'patricia.soto@sanmartin.edu.pe' },
  { id: 'profesor', label: 'Profesor', icon: <Pencil size={15} />, correo: 'c.mendoza@sanmartin.edu.pe' },
  { id: 'alumno', label: 'Estudiante', icon: <GraduationCap size={15} />, correo: 'valeria.quispe@sanmartin.edu.pe' },
  { id: 'apoderado', label: 'Padre de familia', icon: <BookOpen size={15} />, correo: 'rosa.rojas@gmail.com' },
];

/** import.meta.env.DEV es true solo con "npm run dev"; false en el build publicado. */
const ES_DESARROLLO = import.meta.env.DEV;

export default function Login() {
  const [rol, setRol] = useState<Rol>('admin');
  const [correo, setCorreo] = useState(ES_DESARROLLO ? 'patricia.soto@sanmartin.edu.pe' : '');
  const [pass, setPass] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { iniciar } = useAuth();
  const nav = useNavigate();

  async function entrar() {
    setError(null);
    setCargando(true);
    try {
      const u = await login(correo, pass);
      iniciar(u);
      nav('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-canvas px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[.035]" aria-hidden>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-40 h-24 rounded-2xl border-2 border-ink"
            style={{ top: `${(i * 37) % 90}%`, left: `${(i * 53 + 8) % 92}%`, transform: `rotate(${i % 2 ? 14 : -12}deg)` }}
          />
        ))}
      </div>

      <div className="w-full max-w-[400px] animate-rise">
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-2.5">
            <LogoWillay size={34} />
            <span className="text-[28px] font-bold tracking-tight">Willay</span>
          </div>
          <p className="label-mono mt-2">Gestión escolar · Asistencia RFID</p>
        </div>

        <div className="card p-7 shadow-[0_10px_40px_rgba(0,0,0,.06)]">
          <h1 className="text-[18px] font-bold tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-[12.5px] text-ink-3 mt-1 mb-5">Ingresa con la cuenta asignada por tu institución.</p>

          {ES_DESARROLLO && (
            <>
              <div className="label-mono mb-2">Cuentas de demostración</div>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRol(r.id); setCorreo(r.correo); }}
                    className={cn(
                      'flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-[12.5px] font-medium transition-all cursor-pointer',
                      rol === r.id
                        ? 'border-brand bg-brand-faint text-brand'
                        : 'border-line text-ink-2 hover:border-line-2 hover:text-ink',
                      r.id === 'apoderado' && 'col-span-2 justify-center',
                    )}
                  >
                    {r.icon}{r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="block mb-4">
            <span className="label-mono">Usuario</span>
            <input
              value={correo}
              onChange={e => setCorreo(e.target.value)}
              className="mt-1.5 w-full rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
              placeholder="usuario@colegio.edu.pe"
            />
          </label>
          <label className="block mb-5">
            <span className="label-mono">Contraseña</span>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && entrar()}
              className="mt-1.5 w-full rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[13px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
              placeholder="Tu contraseña"
            />
          </label>

          {error && (
            <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            onClick={entrar}
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-brand text-white font-semibold text-[13.5px] py-3 transition-all hover:bg-brand-strong active:scale-[.99] disabled:opacity-70 cursor-pointer"
          >
            {cargando ? <Loader2 size={15} className="animate-spin" /> : <>Iniciar sesión <ArrowRight size={15} /></>}
          </button>

          <div className="flex justify-between items-center mt-4 text-[12px] text-ink-3">
            <span>¿Problemas para entrar?</span>
            <a href="#" className="font-medium text-ink-2 hover:text-brand transition-colors">Recuperar contraseña</a>
          </div>

          <div className="mt-5 pt-5 border-t border-line">
            <Link
              to="/activar"
              className="group flex items-center justify-between rounded-[10px] bg-brand-faint border border-brand-soft px-4 py-3 transition-all hover:bg-brand-soft"
            >
              <div>
                <p className="text-[12.5px] font-semibold text-ink">¿Primera vez en Willay?</p>
                <p className="text-[11.5px] text-ink-2 mt-0.5">Activa tu cuenta con el código que te dio el colegio</p>
              </div>
              <ArrowRight size={15} className="text-brand shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 label-mono mt-5">
          <ShieldCheck size={12} /> Conexión segura · Datos cifrados
        </p>
      </div>
    </div>
  );
}