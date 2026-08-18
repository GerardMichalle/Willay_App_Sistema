import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Wifi, Flame, CheckCircle2, Award, Loader2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { PanelHead, Mono, Pill, cn } from '../../components/ui';
import { LogoWillay } from '../../components/Sidebar';
import {
  getAlumnos, getQrAlumno, subirFotoPerfil, getEnlaceArchivo, uuidDeRutaArchivo,
  getConductaApi, getLibretas, getHistorialAsistencia,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno, ConductaApi, AsistenciaHistorialApi } from '../../types';

/** yyyy-MM-dd en hora local (evita el corrimiento de un día de toISOString/UTC). */
function comoIso(f: Date): string {
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/**
 * Racha de días de clase consecutivos con asistencia real (PUNTUAL o
 * TARDANZA). Un salto de hasta 3 días calendario se admite como "seguido"
 * para no romper la racha en cada fin de semana.
 */
function calcularRacha(historial: AsistenciaHistorialApi[]): number {
  const presentes = historial
    .filter(h => h.estado === 'PUNTUAL' || h.estado === 'TARDANZA')
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (presentes.length === 0) return 0;

  let racha = 1;
  let anterior = new Date(presentes[0].fecha + 'T00:00:00');
  for (let i = 1; i < presentes.length; i++) {
    const actual = new Date(presentes[i].fecha + 'T00:00:00');
    const diasEntre = Math.round((anterior.getTime() - actual.getTime()) / 86_400_000);
    if (diasEntre >= 1 && diasEntre <= 3) { racha++; anterior = actual; } else break;
  }
  return racha;
}

/**
 * Credencial digital del estudiante.
 * El QR lo emite el backend (GET /api/credenciales/alumno/{id}/qr) y no
 * contiene datos personales: solo identificadores que el lector valida.
 */
function QrCredencial({ alumnoId, size = 108 }: { alumnoId: number | null; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (alumnoId == null) return;
    let vigente = true;
    let creada: string | null = null;
    getQrAlumno(alumnoId)
      .then(u => { if (vigente) { creada = u; setUrl(u); } })
      .catch(() => setError(true));
    return () => { vigente = false; if (creada) URL.revokeObjectURL(creada); };
  }, [alumnoId]);

  if (error || alumnoId == null) {
    return (
      <div style={{ width: size, height: size }}
        className="grid place-items-center rounded-[8px] bg-white/10 text-white/50 text-[10px] text-center px-2">
        Credencial no disponible
      </div>
    );
  }
  if (!url) {
    return (
      <div style={{ width: size, height: size }} className="grid place-items-center rounded-[8px] bg-white/10">
        <Loader2 size={18} className="animate-spin text-white/60" />
      </div>
    );
  }
  return <img src={url} width={size} height={size} alt="Código QR del estudiante"
              className="rounded-[8px] bg-white p-1.5 border border-line" />;
}

export default function MiPerfil() {
  const { usuario } = useAuth();
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [yo, setYo] = useState<Alumno | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const [conducta, setConducta] = useState<ConductaApi[]>([]);
  const [promedio, setPromedio] = useState<number | null>(null);
  const [historial, setHistorial] = useState<AsistenciaHistorialApi[]>([]);

  async function cambiarFoto(f: File | null) {
    if (!f) return;
    setSubiendo(true);
    try {
      const ruta = await subirFotoPerfil(f);
      setFoto(await getEnlaceArchivo(uuidDeRutaArchivo(ruta)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo subir la imagen');
    } finally {
      setSubiendo(false);
    }
  }

  useEffect(() => {
    // El backend devuelve únicamente al propio estudiante cuando el rol es ALUMNO
    getAlumnos()
      .then(l => {
        const a = l[0] ?? null;
        setYo(a);
        setAlumnoId(a ? Number(a.id) : null);
        if (a?.fotoUrl) {
          getEnlaceArchivo(uuidDeRutaArchivo(a.fotoUrl)).then(setFoto).catch(() => setFoto(null));
        }
      })
      .catch(() => setAlumnoId(null));
  }, []);

  useEffect(() => {
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - 45); // suficiente para el mes en curso + una racha razonable

    Promise.all([
      getConductaApi().catch(() => []),
      getLibretas().catch(() => []),
      getHistorialAsistencia(comoIso(desde), comoIso(hoy)).catch(() => []),
    ]).then(([cond, libretas, hist]) => {
      setConducta(cond);
      const promedios = libretas.map(l => l.promedio).filter((p): p is number => p != null);
      setPromedio(promedios.length ? promedios.reduce((a, b) => a + b, 0) / promedios.length : null);
      setHistorial(hist);
    });
  }, []);

  async function descargarQr() {
    if (alumnoId == null) return;
    setDescargando(true);
    try {
      const url = await getQrAlumno(alumnoId);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credencial-willay.png';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  }

  const meritos = conducta.filter(c => c.tipo === 'MERITO').length;
  const ultimaConducta = conducta.length
    ? [...conducta].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
    : null;

  const hoy = new Date();
  const mesTexto = hoy.toLocaleDateString('es-PE', { month: 'long' });
  const mesActual = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);

  const esteMes = historial.filter(h => {
    const f = new Date(h.fecha + 'T00:00:00');
    return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
  });
  const asisti = esteMes.filter(h => h.estado === 'PUNTUAL' || h.estado === 'TARDANZA').length;
  const tardanzasMes = esteMes.filter(h => h.estado === 'TARDANZA').length;
  const faltasMes = esteMes.filter(h => h.estado === 'AUSENTE').length;
  const racha = calcularRacha(historial);

  // Una barra por día hábil (lunes a viernes) del mes en curso.
  const porFecha = new Map(esteMes.map(h => [h.fecha, h.estado]));
  const diasDelMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const barras = Array.from({ length: diasDelMes }, (_, i) => {
    const fechaObj = new Date(hoy.getFullYear(), hoy.getMonth(), i + 1);
    return { dia: i + 1, finDeSemana: fechaObj.getDay() === 0 || fechaObj.getDay() === 6, estado: porFecha.get(comoIso(fechaObj)) };
  }).filter(b => !b.finDeSemana);

  return (
    <>
      <Topbar title="Mi perfil" subtitle="Tu información, tu tarjeta y tu progreso" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {/* Cabecera con identidad */}
        <div className="card overflow-hidden">
          <div className="h-[92px] bg-gradient-to-r from-brand to-[#F2683C] relative">
            <div className="absolute inset-0 opacity-[.15]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
          </div>
          <div className="px-7 pb-6 flex flex-wrap items-end gap-5">
            <div className="relative -mt-9">
              {foto ? (
                <img src={foto} alt="Foto de perfil"
                  className="w-[84px] h-[84px] rounded-full object-cover border-4 border-paper shadow-sm" />
              ) : (
                <span className="grid place-items-center w-[84px] h-[84px] rounded-full bg-brand-soft text-brand text-[26px] font-bold border-4 border-paper shadow-sm">{yo ? (yo.nombres[0] ?? "") + (yo.apellidos[0] ?? "") : "—"}</span>
              )}
              <button
                onClick={() => archivoRef.current?.click()}
                disabled={subiendo}
                className="absolute -bottom-1 -right-1 grid place-items-center w-8 h-8 rounded-full bg-ink text-white hover:bg-brand transition-colors cursor-pointer disabled:opacity-60"
                title="Cambiar foto"
              >
                {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
              <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e => void cambiarFoto(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex-1 min-w-[200px] pb-1">
              <h2 className="text-[19px] font-bold tracking-tight">{yo ? `${yo.nombres} ${yo.apellidos}` : "—"}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Pill tone="brand">{yo ? `${yo.grado} "${yo.seccion}"` : "Sin aula"}</Pill>
                <Mono className="!text-[11px]">COD. {yo?.codigo ?? "—"}</Mono>
                <Mono className="!text-[11px]">{yo?.apoderado ? `Apod. ${yo.apoderado}` : ""}</Mono>
              </div>
            </div>
            <div className="flex gap-6 pb-1">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center text-warn"><Flame size={15} /><span className="text-[20px] font-bold">{racha}</span></div>
                <div className="label-mono !text-[9px] mt-0.5">Días seguidos</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center text-ok"><CheckCircle2 size={15} /><span className="text-[20px] font-bold">{promedio != null ? promedio.toFixed(1) : '—'}</span></div>
                <div className="label-mono !text-[9px] mt-0.5">Promedio</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center text-info"><Award size={15} /><span className="text-[20px] font-bold">{meritos}</span></div>
                <div className="label-mono !text-[9px] mt-0.5">Méritos</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-4">
          {/* Tarjeta digital */}
          <div className="card p-6">
            <PanelHead title="Mi tarjeta digital" sub="Preséntala en el lector si olvidaste tu tarjeta física" />
            <div className="rounded-[16px] bg-[#17181A] text-white p-5 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand/20" />
              <div className="absolute -right-2 -bottom-14 w-32 h-32 rounded-full bg-brand/10" />
              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-2">
                  <LogoWillay size={20} />
                  <span className="font-bold text-[14px]">Willay</span>
                </div>
                <Wifi size={17} className="rotate-90 opacity-80" />
              </div>
              <div className="flex items-end justify-between gap-4 mt-5 relative">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Alumna</div>
                  <div className="font-semibold text-[15px] mt-0.5">{yo ? `${yo.nombres} ${yo.apellidos.split(" ")[0]}` : "—"}</div>
                  <div className="font-mono text-[11px] text-white/70 mt-2">{yo ? `${yo.grado} "${yo.seccion}" · ${yo.codigo}` : "—"}</div>
                  <div className="font-mono text-[13px] font-semibold mt-3 tracking-wider">{yo?.tarjetaRfid ?? "Sin tarjeta"}</div>
                </div>
                <QrCredencial alumnoId={alumnoId} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-[11.5px] text-ink-3">{usuario?.colegio ?? '—'} · válida {new Date().getFullYear()}</p>
              <button
                onClick={descargarQr}
                disabled={alumnoId == null || descargando}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong transition-colors cursor-pointer disabled:opacity-40"
              >
                {descargando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Descargar QR
              </button>
            </div>
          </div>

          {/* Mi asistencia + conducta */}
          <div className="space-y-4">
            <div className="card p-6">
              <PanelHead title={`Mi asistencia · ${mesActual}`} />
              <div className="flex gap-8">
                <div><div className="label-mono">Asistí</div><div className="text-[24px] font-bold text-ok">{asisti}</div></div>
                <div><div className="label-mono">Tardanzas</div><div className="text-[24px] font-bold text-warn">{tardanzasMes}</div></div>
                <div><div className="label-mono">Faltas</div><div className="text-[24px] font-bold">{faltasMes}</div></div>
              </div>
              {barras.length > 0 && (
                <>
                  <div className="mt-4 flex gap-1">
                    {barras.map(b => (
                      <span key={b.dia}
                        className={cn('h-2 flex-1 rounded-full',
                          b.estado === 'TARDANZA' ? 'bg-warn' : b.estado ? 'bg-ok/70' : 'bg-line')}
                        title={`Día ${b.dia}${b.estado ? ` · ${b.estado}` : ' · sin registro'}`} />
                    ))}
                  </div>
                  <p className="text-[11.5px] text-ink-3 mt-2">Cada barra es un día de clases del mes (lunes a viernes).</p>
                </>
              )}
            </div>
            <div className="card p-6">
              <PanelHead title="Mi conducta" />
              {ultimaConducta ? (
                <div className="flex items-start gap-3">
                  <span className={cn('grid place-items-center w-8 h-8 rounded-full shrink-0',
                    ultimaConducta.tipo === 'MERITO' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad')}>
                    <Award size={14} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">
                      {ultimaConducta.tipo === 'MERITO' ? 'Mérito' : 'Observación'} · {ultimaConducta.categoria}
                    </p>
                    <p className="text-[12px] text-ink-2 mt-0.5">{ultimaConducta.descripcion}</p>
                    <Mono className="!text-[10.5px] mt-1 block">{ultimaConducta.fecha} · {ultimaConducta.registradoPor}</Mono>
                  </div>
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-3 py-4 text-center">Aún no tienes registros de conducta.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
