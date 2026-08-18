import { useEffect, useState, type ReactNode } from 'react';
import type { EstadoAsistencia } from '../types';
import { getEnlaceArchivo, uuidDeRutaArchivo } from '../services/api';

export function cn(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}

/* ── Avatar con iniciales (o foto, si el usuario tiene una) ─────────── */
const AV_COLORS = [
  'bg-[#FDEBEB] text-[#C51F1F]',
  'bg-[#EAF1FE] text-[#2255C4]',
  'bg-[#E8F6EE] text-[#187A44]',
  'bg-[#FBF1E2] text-[#A3650C]',
  'bg-[#F1EAFE] text-[#6D3FC4]',
];
export function Avatar({ nombre, fotoUrl, size = 'md' }: {
  nombre: string; fotoUrl?: string | null; size?: 'sm' | 'md' | 'lg';
}) {
  const ini = nombre.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const color = AV_COLORS[(nombre.charCodeAt(0) + nombre.length) % AV_COLORS.length];
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-11 h-11 text-[14px]' : 'w-9 h-9 text-[11.5px]';

  // fotoUrl es una ruta protegida ("/api/archivos/{uuid}"): hace falta un
  // enlace firmado para poder mostrarla, y ese enlace expira en minutos —
  // por eso se resuelve aquí, en cada montaje, en vez de guardarse en sesión.
  const [urlResuelta, setUrlResuelta] = useState<string | null>(null);
  useEffect(() => {
    if (!fotoUrl) { setUrlResuelta(null); return; }
    let vigente = true;
    getEnlaceArchivo(uuidDeRutaArchivo(fotoUrl))
      .then(u => { if (vigente) setUrlResuelta(u); })
      .catch(() => { if (vigente) setUrlResuelta(null); });
    return () => { vigente = false; };
  }, [fotoUrl]);

  if (urlResuelta) {
    return (
      <img src={urlResuelta} alt={nombre}
        className={cn('inline-block rounded-full object-cover shrink-0', sz)} />
    );
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-semibold shrink-0', color, sz)}>
      {ini}
    </span>
  );
}

/* ── Badge de estado de asistencia ────────────────────────────────── */
const ESTADOS: Record<EstadoAsistencia, { txt: string; cls: string }> = {
  puntual: { txt: 'Puntual', cls: 'bg-ok-soft text-ok' },
  tardanza: { txt: 'Tardanza', cls: 'bg-warn-soft text-warn' },
  ausente: { txt: 'Ausente', cls: 'bg-bad-soft text-bad' },
  justificado: { txt: 'Justificado', cls: 'bg-info-soft text-info' },
};
export function EstadoBadge({ estado }: { estado: EstadoAsistencia }) {
  const e = ESTADOS[estado];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', e.cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {e.txt}
    </span>
  );
}

/* ── Pill genérico ────────────────────────────────────────────────── */
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'brand' }) {
  const tones = {
    neutral: 'bg-canvas text-ink-2 border border-line',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    info: 'bg-info-soft text-info',
    brand: 'bg-brand-soft text-brand',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

/* ── Botones ──────────────────────────────────────────────────────── */
export function Button({ children, variant = 'solid', onClick, className, disabled, title }: {
  children: ReactNode; variant?: 'solid' | 'ghost' | 'soft'; onClick?: () => void;
  className?: string; disabled?: boolean; title?: string;
}) {
  const v = {
    solid: 'bg-brand text-white hover:bg-brand-strong shadow-sm',
    ghost: 'border border-line text-ink-2 hover:text-ink hover:border-line-2 bg-paper',
    soft: 'bg-brand-soft text-brand hover:bg-brand hover:text-white',
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-all active:scale-[.98] cursor-pointer',
        'disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100',
        v, className)}
    >
      {children}
    </button>
  );
}

/* ── Card de estadística ──────────────────────────────────────────── */
export function StatCard({ icon, label, value, denom, note, noteTone = 'ok' }: {
  icon: ReactNode; label: string; value: string; denom?: string; note: string; noteTone?: 'ok' | 'warn' | 'bad' | 'neutral';
}) {
  const tones = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', neutral: 'text-ink-3' };
  return (
    <div className="card p-5 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,.05)] hover:-translate-y-px animate-rise">
      <div className="flex items-start justify-between">
        <span className="text-ink-2">{icon}</span>
      </div>
      <div className="label-mono mt-3">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[27px] font-bold tracking-tight leading-none">{value}</span>
        {denom && <span className="text-[14px] font-medium text-ink-3">/{denom}</span>}
      </div>
      <div className={cn('mt-2 flex items-center gap-1.5 text-[11.5px] font-medium', tones[noteTone])}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="text-ink-2">{note}</span>
      </div>
    </div>
  );
}

/* ── Encabezado de panel ──────────────────────────────────────────── */
export function PanelHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h3 className="text-[15px] font-bold tracking-tight">{title}</h3>
        {sub && <p className="text-[12px] text-ink-3 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── Tabla ────────────────────────────────────────────────────────── */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-canvas">
              {head.map(h => (
                <th key={h} className="label-mono text-left px-5 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-t border-line transition-colors hover:bg-canvas group">
      {children}
    </tr>
  );
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-5 py-3.5 align-middle', className)}>{children}</td>;
}

/* ── Mono (dato técnico) ──────────────────────────────────────────── */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[12px] text-ink-2', className)}>{children}</span>;
}

/* ── Buscador + filtros de tabla ──────────────────────────────────── */
export function FilterTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer',
            t === active ? 'bg-ink text-paper' : 'text-ink-2 border border-line hover:border-line-2 hover:text-ink bg-paper',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ── Estado vacío ─────────────────────────────────────────────────── */
export function Empty({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-ink-3">{icon}</span>
      <p className="mt-3 font-semibold text-[14px]">{title}</p>
      <p className="mt-1 text-[12.5px] text-ink-3 max-w-[300px]">{hint}</p>
    </div>
  );
}
