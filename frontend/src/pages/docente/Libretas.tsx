import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, BookMarked, Upload, FileText, CheckCircle2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill, FilterTabs } from '../../components/ui';
import { getAlumnos, getLibretas, getAulasTutoria, subirDocumento, subirLibretaEscaneada } from '../../services/api';
import type { Alumno, LibretaApi } from '../../types';

const PERIODOS = ['I BIMESTRE', 'II BIMESTRE', 'III BIMESTRE', 'IV BIMESTRE'];

export default function Libretas() {
  const anio = new Date().getFullYear();

  const [aulasTutoria, setAulasTutoria] = useState<number[] | null>(null);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [libretas, setLibretas] = useState<LibretaApi[]>([]);
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subiendoId, setSubiendoId] = useState<number | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const alumnoObjetivo = useRef<Alumno | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [tutoria, al, lb] = await Promise.all([getAulasTutoria(), getAlumnos(), getLibretas()]);
      setAulasTutoria(tutoria);
      setAlumnos(al);
      setLibretas(lb);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const misAlumnos = alumnos.filter(a => a.aulaId != null && aulasTutoria?.includes(a.aulaId));

  function libretaDe(alumnoId: string) {
    return libretas.find(l => String(l.alumnoId) === alumnoId && l.periodo === periodo);
  }

  function elegirArchivo(a: Alumno) {
    alumnoObjetivo.current = a;
    archivoRef.current?.click();
  }

  async function subir(f: File | null) {
    const a = alumnoObjetivo.current;
    if (!f || !a) return;
    setSubiendoId(Number(a.id));
    setError(null);
    try {
      const url = await subirDocumento(f);
      await subirLibretaEscaneada({ alumnoId: Number(a.id), periodo, anioEscolar: anio, archivoUrl: url });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la libreta');
    } finally {
      setSubiendoId(null);
    }
  }

  const subidas = misAlumnos.filter(a => libretaDe(a.id)).length;

  return (
    <>
      <input ref={archivoRef} type="file" className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={e => { void subir(e.target.files?.[0] ?? null); e.target.value = ''; }} />

      <Topbar
        title="Libretas"
        subtitle={cargando ? 'Cargando…' : `${periodo} ${anio} · ${subidas}/${misAlumnos.length} subidas`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : aulasTutoria?.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4">
              <BookMarked size={22} />
            </span>
            <p className="text-[14px] font-semibold">Solo el tutor del aula publica la libreta</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[380px] mx-auto">
              No eres tutor de ninguna aula este año escolar. Si dictas un curso, es el tutor del
              aula quien sube la libreta consolidada de sus estudiantes.
            </p>
          </div>
        ) : (
          <>
            <div className="card p-5 flex flex-wrap items-center gap-4">
              <span className="grid place-items-center w-10 h-10 rounded-[10px] bg-brand-soft text-brand shrink-0">
                <BookMarked size={17} />
              </span>
              <p className="text-[12.5px] text-ink-2 flex-1 min-w-[240px]">
                Sube la libreta oficial ya escaneada (PDF o imagen) de cada estudiante. Al subirla,
                el estudiante y su apoderado reciben una notificación y pueden verla en su portal.
              </p>
              <FilterTabs tabs={PERIODOS} active={periodo} onChange={setPeriodo} />
            </div>

            {misAlumnos.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-[14px] font-semibold">No tienes estudiantes en tu aula de tutoría</p>
              </div>
            ) : (
              <Table head={['Estudiante', 'Estado', 'Acción']}>
                {misAlumnos.map(a => {
                  const lb = libretaDe(a.id);
                  const subiendo = subiendoId === Number(a.id);
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar nombre={`${a.nombres} ${a.apellidos}`} size="sm" />
                          <div className="leading-tight">
                            <p className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</p>
                            <Mono className="!text-[10.5px]">{a.codigo} · {a.grado} "{a.seccion}"</Mono>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {lb ? (
                          <Pill tone="ok"><CheckCircle2 size={11} /> Subida · {lb.publicadaEn}</Pill>
                        ) : (
                          <Pill tone="neutral">Sin subir</Pill>
                        )}
                      </Td>
                      <Td>
                        <button onClick={() => elegirArchivo(a)} disabled={subiendo}
                          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong cursor-pointer disabled:opacity-50">
                          {subiendo ? <Loader2 size={12} className="animate-spin" /> : lb ? <FileText size={12} /> : <Upload size={12} />}
                          {lb ? 'Reemplazar' : 'Subir libreta'}
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            )}
          </>
        )}
      </div>
    </>
  );
}
