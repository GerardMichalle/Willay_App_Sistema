import { NavLink, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Users, HeartHandshake, BookOpen, Flag,
  Radio, ListOrdered, Megaphone, TrendingUp, PieChart,
  UserCog, ShieldCheck, Settings, LogOut, LayoutGrid, FileSignature,
  Sparkles, IdCard, BookMarked, School, Building2, CreditCard, ScrollText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEnlaceArchivo } from '../hooks/useEnlaceArchivo';
import { cn } from './ui';
import type { Rol } from '../types';

const IC = 16;

/** roles opcional: si no se indica, el ítem hereda los roles del grupo. */
interface Item { to: string; label: string; icon: React.ReactNode; badge?: string; roles?: Rol[] }
interface Group { label: string | null; items: Item[]; roles: Rol[] }

const NAV: Group[] = [
  {
    label: null,
    roles: ['superadmin', 'direccion', 'admin', 'profesor', 'alumno', 'apoderado'],
    items: [{ to: '/', label: 'Inicio', icon: <LayoutGrid size={IC} /> }],
  },
  // ── Proveedor (Willay) ────────────────────────────────────────────
  {
    label: 'Plataforma',
    roles: ['superadmin'],
    items: [
      { to: '/colegios', label: 'Instituciones', icon: <Building2 size={IC} /> },
      { to: '/auditoria', label: 'Auditoría', icon: <ScrollText size={IC} /> },
      { to: '/cursos', label: 'Catálogo de cursos', icon: <Sparkles size={IC} /> },
    ],
  },
  // ── Admin y Dirección ─────────────────────────────────────────────
  {
    label: 'Gestión',
    roles: ['direccion', 'admin'],
    items: [
      { to: '/matriculas', label: 'Matrículas', icon: <FileSignature size={IC} /> },
      { to: '/alumnos', label: 'Alumnos', icon: <GraduationCap size={IC} /> },
      { to: '/aulas', label: 'Aulas', icon: <School size={IC} /> },
      { to: '/vincular-tarjetas', label: 'Vincular tarjetas', icon: <CreditCard size={IC} />, roles: ['admin'] },
      { to: '/apoderados', label: 'Apoderados', icon: <HeartHandshake size={IC} /> },
      { to: '/docentes', label: 'Docentes', icon: <Users size={IC} /> },
    ],
  },
  {
    label: 'Asistencia',
    roles: ['direccion', 'admin'],
    items: [
      { to: '/asistencia/vivo', label: 'Control en vivo', icon: <Radio size={IC} />, badge: 'EN VIVO' },
      { to: '/asistencia/historial', label: 'Historial', icon: <ListOrdered size={IC} /> },
    ],
  },
  {
    label: 'Formación',
    roles: ['direccion', 'admin'],
    items: [
      { to: '/conducta', label: 'Conducta', icon: <Flag size={IC} /> },
      { to: '/cursos', label: 'Cursos gratuitos', icon: <Sparkles size={IC} /> },
    ],
  },
  // ── Docente ───────────────────────────────────────────────────────
  {
    label: 'Mi aula',
    roles: ['profesor'],
    items: [
      { to: '/asistencia/vivo', label: 'Asistencia en vivo', icon: <Radio size={IC} />, badge: 'EN VIVO' },
      { to: '/asistencia/historial', label: 'Historial', icon: <ListOrdered size={IC} /> },
      { to: '/libretas', label: 'Notas y libretas', icon: <BookMarked size={IC} /> },
      { to: '/conducta', label: 'Conducta', icon: <Flag size={IC} /> },
    ],
  },
  {
    label: 'Aprende',
    roles: ['profesor'],
    items: [{ to: '/cursos', label: 'Cursos gratuitos', icon: <Sparkles size={IC} /> }],
  },
  // ── Alumno ────────────────────────────────────────────────────────
  {
    label: 'Yo',
    roles: ['alumno'],
    items: [
      { to: '/mi-perfil', label: 'Mi perfil', icon: <IdCard size={IC} /> },
      { to: '/libreta', label: 'Mis notas', icon: <BookOpen size={IC} /> },
      { to: '/asistencia/historial', label: 'Mi asistencia', icon: <ListOrdered size={IC} /> },
    ],
  },
  {
    label: 'Aprende',
    roles: ['alumno'],
    items: [{ to: '/cursos', label: 'Cursos gratuitos', icon: <Sparkles size={IC} /> }],
  },
  // ── Apoderado ─────────────────────────────────────────────────────
  {
    label: 'Mi hijo',
    roles: ['apoderado'],
    items: [
      { to: '/asistencia/historial', label: 'Asistencia', icon: <ListOrdered size={IC} /> },
      { to: '/libreta', label: 'Libreta de notas', icon: <BookOpen size={IC} /> },
      { to: '/conducta', label: 'Conducta', icon: <Flag size={IC} /> },
    ],
  },
  {
    label: 'Aprende',
    roles: ['apoderado'],
    items: [{ to: '/cursos', label: 'Cursos gratuitos', icon: <Sparkles size={IC} /> }],
  },
  // ── Comunicación (todos) ──────────────────────────────────────────
  {
    label: 'Comunicación',
    roles: ['direccion', 'admin', 'profesor', 'alumno', 'apoderado'],
    items: [{ to: '/comunicados', label: 'Comunicados', icon: <Megaphone size={IC} /> }],
  },
  // ── Análisis y sistema ────────────────────────────────────────────
  {
    label: 'Análisis',
    roles: ['direccion', 'admin'],
    items: [
      { to: '/reportes', label: 'Reportes', icon: <TrendingUp size={IC} /> },
      { to: '/estadisticas', label: 'Estadísticas', icon: <PieChart size={IC} /> },
    ],
  },
  {
    label: 'Sistema',
    roles: ['admin'],
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: <UserCog size={IC} /> },
      { to: '/roles', label: 'Roles', icon: <ShieldCheck size={IC} /> },
      { to: '/configuracion', label: 'Configuración', icon: <Settings size={IC} /> },
    ],
  },
];

/** Insignia pequeña del colegio del usuario — nada si todavía no subió un logo. */
function InsigniaColegio({ nombre, logoUrl }: { nombre: string; logoUrl?: string | null }) {
  const url = useEnlaceArchivo(logoUrl);
  if (!url) return null;
  return <img src={url} alt={nombre} className="w-5 h-5 rounded-[6px] object-cover shrink-0 border border-line" />;
}

export function LogoWillay({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <g fill="var(--color-brand)">
        <circle cx="16" cy="7" r="4.4" />
        <circle cx="16" cy="25" r="4.4" />
        <circle cx="7" cy="16" r="4.4" />
        <circle cx="25" cy="16" r="4.4" />
        <circle cx="16" cy="16" r="3.4" fill="#F5B8B8" />
      </g>
    </svg>
  );
}

export default function Sidebar({ enCajon = false, onNavegar }: { enCajon?: boolean; onNavegar?: () => void }) {
  const { usuario, cerrar } = useAuth();
  const nav = useNavigate();
  if (!usuario) return null;

  const groups = NAV.filter(g => g.roles.includes(usuario.rol));

  return (
    <aside className={enCajon
      ? 'w-[264px] bg-paper h-full flex flex-col'
      : 'w-[232px] shrink-0 bg-paper border-r border-line h-screen sticky top-0 hidden lg:flex flex-col'}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <LogoWillay />
          <span className="text-[19px] font-bold tracking-tight">Willay</span>
        </div>
        {usuario.rol !== 'superadmin' && usuario.colegio && (
          <div className="flex items-center gap-1.5 mt-2">
            <InsigniaColegio nombre={usuario.colegio} logoUrl={usuario.colegioLogoUrl} />
            <span className="text-[11px] text-ink-3 font-medium truncate">{usuario.colegio}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-4">
        {groups.map((g, i) => (
          <div key={i} className="mb-1">
            {g.label && <div className="label-mono px-3 pt-4 pb-1.5">{g.label}</div>}
            {g.items.filter(item => (item.roles ?? g.roles).includes(usuario.rol)).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavegar}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 rounded-[10px] px-3 py-[8.5px] text-[13px] font-medium transition-colors mb-0.5',
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-canvas hover:text-ink',
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="flex items-center gap-1 font-mono text-[9px] font-semibold text-brand">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand dot-live" />
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={() => { cerrar(); nav('/login'); }}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-ink-2 hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
        >
          <LogOut size={IC} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
