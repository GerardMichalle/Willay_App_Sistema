import { LogoWillay } from './Sidebar';
import loginImg from '../../imglogin/loginimg.jpg';

/** Íconos de marca dibujados a mano (el proyecto no usa Ionicons ni ninguna librería de logos). */
function IconInstagram() {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.719-.891.923-1.417.198-.509.333-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.174-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
    </svg>
  );
}
function IconTiktok() {
  return (
    <svg width={15} height={15} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z" />
    </svg>
  );
}

/** Placeholders — se reemplazan por las cuentas reales de Willay más adelante. */
const REDES = [
  { label: 'Instagram', href: 'https://instagram.com/willayedu', icon: <IconInstagram /> },
  { label: 'TikTok', href: 'https://tiktok.com/@willayedu', icon: <IconTiktok /> },
];

/**
 * Columna de marca compartida por las pantallas públicas (login, activación):
 * foto + overlay + logo en píldora + frase + redes sociales. Oculta en móvil.
 */
export default function PanelMarca() {
  return (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden">
      <img src={loginImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" aria-hidden />

      <div className="relative z-10 p-8">
        <div className="inline-flex items-center gap-2.5 bg-paper/95 backdrop-blur rounded-full pl-3 pr-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,.18)]">
          <LogoWillay size={24} />
          <span className="text-[16px] font-bold tracking-tight text-ink">Willay</span>
        </div>
      </div>

      <div className="relative z-10 p-8">
        <p className="text-white text-[26px] font-bold leading-snug tracking-tight max-w-[420px] [text-shadow:0_2px_20px_rgba(0,0,0,.5)]">

        </p>

        <div className="flex items-center gap-2.5 mt-7">
          {REDES.map(r => (
            <a
              key={r.label}
              href={r.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/30 text-white/90 text-[12px] font-medium px-4 py-2 transition-colors hover:bg-white/10 hover:border-white/50"
            >
              {r.icon}{r.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
