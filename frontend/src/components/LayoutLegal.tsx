import { Link } from 'react-router-dom';
import { LogoWillay } from './Sidebar';

/** Envoltorio visual compartido por las páginas legales públicas (sin sesión, sin Topbar/Sidebar). */
export default function LayoutLegal({ titulo, actualizado, children }: {
  titulo: string; actualizado: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-paper">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <LogoWillay size={24} />
            <span className="text-[16px] font-bold tracking-tight">Willay</span>
          </Link>
          <nav className="flex items-center gap-4 text-[12.5px] font-medium text-ink-2">
            <Link to="/legal/privacidad" className="hover:text-brand transition-colors">Privacidad</Link>
            <Link to="/legal/terminos" className="hover:text-brand transition-colors">Términos</Link>
            <Link to="/legal/eliminar-cuenta" className="hover:text-brand transition-colors">Eliminar cuenta</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <p className="label-mono text-brand mb-2">Documento legal</p>
        <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-balance">{titulo}</h1>
        <p className="text-[12.5px] text-ink-3 mt-2">Última actualización: {actualizado}</p>

        <div className="mt-10 legal-doc">
          {children}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-6 text-[11.5px] text-ink-3">
          © {new Date().getFullYear()} Willay · Sistema Integral de Gestión Escolar
        </div>
      </footer>
    </div>
  );
}
