import { useId } from 'react';

/**
 * Banderas como SVG propio, no como emoji: en Windows, el emoji de bandera
 * (🇵🇪, 🇨🇱, etc.) no tiene glifo en la fuente del sistema y se muestra como
 * texto plano ("PE", "CL"...), dentro o fuera de un <select>. Un <option>
 * nativo tampoco admite SVG/HTML — por eso el selector de país ya no usa
 * <select>, ver components/TelefonoInput.tsx.
 */

// Estrella de 5 puntas centrada en (5,5), radio externo 2.3 / interno 0.9.
const PUNTOS_ESTRELLA = 'M5,2.7 L5.53,4.27 L7.19,4.29 L5.86,5.28 L6.35,6.86 L5,5.9 L3.65,6.86 L4.14,5.28 L2.81,4.29 L4.47,4.27 Z';

function Svg({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 30 20" role="img" className="w-full h-full">
      <defs>
        <clipPath id={id}>
          <rect width="30" height="20" rx="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </svg>
  );
}

const BANDERAS: Record<string, (id: string) => React.ReactNode> = {
  '+51': id => ( // Perú: rojo | blanco | rojo
    <Svg id={id}>
      <rect width="30" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#D91023" />
      <rect x="20" width="10" height="20" fill="#D91023" />
    </Svg>
  ),
  '+57': id => ( // Colombia: amarillo (mitad) / azul / rojo
    <Svg id={id}>
      <rect width="30" height="20" fill="#FCD116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#CE1126" />
    </Svg>
  ),
  '+56': id => ( // Chile: blanco/rojo, cuadro azul con estrella
    <Svg id={id}>
      <rect width="30" height="20" fill="#fff" />
      <rect y="10" width="30" height="10" fill="#D52B1E" />
      <rect width="10" height="10" fill="#0039A6" />
      <path d={PUNTOS_ESTRELLA} fill="#fff" />
    </Svg>
  ),
  '+593': id => ( // Ecuador: como Colombia + un dato central del escudo simplificado
    <Svg id={id}>
      <rect width="30" height="20" fill="#FFDD00" />
      <rect y="10" width="30" height="5" fill="#034EA2" />
      <rect y="15" width="30" height="5" fill="#ED1C24" />
      <circle cx="15" cy="10" r="3" fill="#FFDD00" stroke="#8B5E3C" strokeWidth="0.6" />
    </Svg>
  ),
  '+591': id => ( // Bolivia: rojo / amarillo / verde
    <Svg id={id}>
      <rect width="30" height="6.67" fill="#D52B1E" />
      <rect y="6.67" width="30" height="6.67" fill="#F9E300" />
      <rect y="13.34" width="30" height="6.67" fill="#007934" />
    </Svg>
  ),
  '+54': id => ( // Argentina: celeste / blanco / celeste + sol
    <Svg id={id}>
      <rect width="30" height="6.67" fill="#74ACDF" />
      <rect y="6.67" width="30" height="6.67" fill="#fff" />
      <rect y="13.34" width="30" height="6.67" fill="#74ACDF" />
      <circle cx="15" cy="10" r="2.2" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3" />
    </Svg>
  ),
  '+55': id => ( // Brasil: verde, rombo amarillo, círculo azul
    <Svg id={id}>
      <rect width="30" height="20" fill="#009739" />
      <polygon points="15,3 27,10 15,17 3,10" fill="#FEDD00" />
      <circle cx="15" cy="10" r="4" fill="#012169" />
    </Svg>
  ),
  '+52': id => ( // México: verde | blanco | rojo + dato central del escudo simplificado
    <Svg id={id}>
      <rect width="30" height="20" fill="#fff" />
      <rect width="10" height="20" fill="#006341" />
      <rect x="20" width="10" height="20" fill="#CE1126" />
      <circle cx="15" cy="10" r="2.6" fill="#8B5E3C" opacity="0.85" />
    </Svg>
  ),
  '+34': id => ( // España: rojo / amarillo (doble) / rojo
    <Svg id={id}>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </Svg>
  ),
  '+1': id => ( // Estados Unidos: franjas + cantón azul con estrellas simplificado
    <Svg id={id}>
      <rect width="30" height="20" fill="#fff" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        i % 2 === 0 && <rect key={i} y={i * (20 / 7)} width="30" height={20 / 7} fill="#B22234" />
      ))}
      <rect width="12" height={4 * (20 / 7)} fill="#3C3B6E" />
      {[0, 1].map(fila => [0, 1, 2].map(col => (
        <circle key={`${fila}-${col}`} cx={2.5 + col * 3.5} cy={2.5 + fila * 4} r="0.6" fill="#fff" />
      )))}
    </Svg>
  ),
};

/** Bandera de un país por su código telefónico (p. ej. "+51"). */
export default function Bandera({ codigo, className }: { codigo: string; className?: string }) {
  const id = useId();
  const dibujar = BANDERAS[codigo];
  return (
    <span className={`inline-block overflow-hidden rounded-[3px] border border-line/60 shrink-0 ${className ?? 'w-5 h-3.5'}`}>
      {dibujar ? dibujar(id) : null}
    </span>
  );
}
