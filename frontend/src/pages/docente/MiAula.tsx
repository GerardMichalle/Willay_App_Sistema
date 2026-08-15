import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, UserX, Flag, BookMarked, Megaphone, Radio } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, Table, Tr, Td, Avatar, EstadoBadge, Mono, PanelHead } from '../../components/ui';
import { getAlumnos } from '../../services/api';
import type { Alumno } from '../../types';

/** Panel del docente: SOLO su aula asignada (5° A en la demo).
 *  TODO Spring Boot: GET /api/aulas/{aulaId}/alumnos según el docente autenticado. */
export default function MiAula() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  useEffect(() => {
    // El backend ya acota la lista a las aulas asignadas al docente
    getAlumnos().then(setAlumnos).catch(() => setAlumnos([]));
  }, []);

  const presentes = alumnos.filter(a => a.entradaHoy).length;
  const tardanzas = alumnos.filter(a => a.estadoHoy === 'tardanza').length;
  const ausentes = alumnos.filter(a => a.estadoHoy === 'ausente').length;

  return (
    <>
      <Topbar title="Mi aula · 5° A" subtitle="Tutoría a tu cargo · 28 estudiantes" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<Users size={19} strokeWidth={1.7} />} label="En el aula ahora" value={String(presentes)} denom="28" note="Actualizado en tiempo real" noteTone="ok" />
          <StatCard icon={<Clock size={19} strokeWidth={1.7} />} label="Tardanzas hoy" value={String(tardanzas)} note="Diego llegó 08:14" noteTone="warn" />
          <StatCard icon={<UserX size={19} strokeWidth={1.7} />} label="Ausentes" value={String(ausentes)} note="Sin justificar aún" noteTone="bad" />
          <StatCard icon={<BookMarked size={19} strokeWidth={1.7} />} label="Libretas II Bim." value="26" denom="28" note="2 por publicar" noteTone="warn" />
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
          <Table head={['Estudiante', 'Código', 'Apoderado', 'Entrada hoy', 'Estado']}>
            {alumnos.map(a => (
              <Tr key={a.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} size="sm" />
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
        </div>
      </div>
    </>
  );
}
