import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, UserX, Flag, BookMarked, Megaphone, Radio, School, Loader2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, Table, Tr, Td, Avatar, EstadoBadge, Mono, PanelHead } from '../../components/ui';
import { getAlumnos, getAulasTutoria, getLibretas } from '../../services/api';
import type { Alumno } from '../../types';

/** Mismo bimestre por defecto que ya usa Libretas.tsx, para que ambas pantallas coincidan. */
const PERIODO_ACTUAL = 'II BIMESTRE';

/**
 * Panel del docente: su aula de TUTORÍA (no todas las que dicta — un
 * profesor puede enseñar en varias aulas pero solo tutoría una).
 * Mismo patrón de datos reales que ya usa Libretas.tsx.
 */
export default function MiAula() {
  const [aulasTutoria, setAulasTutoria] = useState<number[] | null>(null);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [subidas, setSubidas] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([getAulasTutoria(), getAlumnos(), getLibretas()])
      .then(([tutoria, al, libretas]) => {
        setAulasTutoria(tutoria);
        setAlumnos(al);
        const misIds = new Set(
          al.filter(a => a.aulaId != null && tutoria.includes(a.aulaId)).map(a => a.id));
        setSubidas(libretas.filter(l => l.periodo === PERIODO_ACTUAL && misIds.has(String(l.alumnoId))).length);
      })
      .catch(() => { setAulasTutoria([]); setAlumnos([]); })
      .finally(() => setCargando(false));
  }, []);

  const misAlumnos = alumnos.filter(a => a.aulaId != null && aulasTutoria?.includes(a.aulaId));
  const aulaEtiqueta = misAlumnos[0] ? `${misAlumnos[0].grado} "${misAlumnos[0].seccion}"` : null;

  const presentes = misAlumnos.filter(a => a.entradaHoy).length;
  const tardanzas = misAlumnos.filter(a => a.estadoHoy === 'tardanza').length;
  const ausentes = misAlumnos.filter(a => a.estadoHoy === 'ausente').length;
  const porPublicar = misAlumnos.length - subidas;

  if (cargando) {
    return (
      <>
        <Topbar title="Mi aula" subtitle="Cargando…" />
        <div className="px-4 sm:px-8 pb-10">
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        </div>
      </>
    );
  }

  if (aulasTutoria?.length === 0) {
    return (
      <>
        <Topbar title="Mi aula" subtitle="Tutoría a tu cargo" />
        <div className="px-4 sm:px-8 pb-10 max-w-[1280px]">
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4">
              <School size={22} />
            </span>
            <p className="text-[14px] font-semibold">No eres tutor de ninguna aula este año escolar</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[380px] mx-auto">
              Si dictas un curso sin ser tutor, usa Asistencia en vivo o Conducta para tus estudiantes desde el menú lateral.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title={aulaEtiqueta ? `Mi aula · ${aulaEtiqueta}` : 'Mi aula'}
        subtitle={`Tutoría a tu cargo · ${misAlumnos.length} estudiante${misAlumnos.length === 1 ? '' : 's'}`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<Users size={19} strokeWidth={1.7} />} label="En el aula ahora"
            value={String(presentes)} denom={String(misAlumnos.length)} note="Actualizado en tiempo real" noteTone="ok" />
          <StatCard icon={<Clock size={19} strokeWidth={1.7} />} label="Tardanzas hoy"
            value={String(tardanzas)} note={tardanzas ? 'Ingresaron fuera de hora' : 'Ninguna hoy'} noteTone="warn" />
          <StatCard icon={<UserX size={19} strokeWidth={1.7} />} label="Ausentes"
            value={String(ausentes)} note={ausentes ? 'Sin justificar aún' : 'Ninguno hoy'} noteTone="bad" />
          <StatCard icon={<BookMarked size={19} strokeWidth={1.7} />} label="Libretas II Bim."
            value={String(subidas)} denom={String(misAlumnos.length)}
            note={porPublicar > 0 ? `${porPublicar} por publicar` : 'Todas publicadas'} noteTone={porPublicar > 0 ? 'warn' : 'ok'} />
        </div>

        <div className="card p-5 flex flex-wrap items-center gap-3">
          <span className="label-mono mr-2">Acciones rápidas</span>
          <Link to="/asistencia/vivo" className="flex items-center gap-1.5 rounded-[10px] bg-brand text-white px-3.5 py-2 text-[12.5px] font-semibold hover:bg-brand-strong transition-colors"><Radio size={14} /> Asistencia en vivo</Link>
          <Link to="/libretas" className="flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink hover:border-line-2 transition-colors"><BookMarked size={14} /> Subir notas</Link>
          <Link to="/conducta" className="flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink hover:border-line-2 transition-colors"><Flag size={14} /> Registrar conducta</Link>
          <Link to="/comunicados" className="flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:text-ink hover:border-line-2 transition-colors"><Megaphone size={14} /> Comunicado al aula</Link>
        </div>

        <div>
          <PanelHead title="Mis estudiantes" sub="Estado de asistencia de hoy" />
          {misAlumnos.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-[13px] text-ink-3">Aún no hay estudiantes matriculados en tu aula.</p>
            </div>
          ) : (
            <Table head={['Estudiante', 'Código', 'Apoderado', 'Entrada hoy', 'Estado']}>
              {misAlumnos.map(a => (
                <Tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} size="sm" />
                      <span className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</span>
                    </div>
                  </Td>
                  <Td><Mono>{a.codigo}</Mono></Td>
                  <Td className="text-[12.5px] text-ink-2">{a.apoderado} · <Mono className="!text-[11px]">{a.telefonoApoderado}</Mono></Td>
                  <Td><Mono className="font-semibold !text-ink">{a.entradaHoy ?? '—'}</Mono></Td>
                  <Td><EstadoBadge estado={a.estadoHoy} /></Td>
                </Tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
