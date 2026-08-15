import { useEffect, useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, EstadoBadge, Mono, Button, FilterTabs } from '../../components/ui';
import { getAlumnos, exportarAsistencia } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno } from '../../types';

export default function Historial() {
  const { usuario } = useAuth();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [tab, setTab] = useState('Hoy');
  useEffect(() => {
    // El backend ya aplica el alcance por rol (aula del docente, hijos del apoderado)
    getAlumnos().then(setAlumnos).catch(() => setAlumnos([]));
  }, [usuario]);

  return (
    <>
      <Topbar
        title={usuario?.rol === 'alumno' ? 'Mi asistencia'
          : usuario?.rol === 'apoderado' ? 'Asistencia de mis hijos'
          : 'Historial de asistencia'}
        subtitle={usuario?.rol === 'profesor'
          ? `Registros de tu aula${usuario.aula ? ` · ${usuario.aula}` : ''}`
          : 'Registros con fecha, hora de entrada y salida'}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={['Hoy', 'Esta semana', 'Este mes', 'Bimestre']} active={tab} onChange={setTab} />
          <div className="flex gap-2">
            <Button variant="ghost">Todos los grados <ChevronDown size={13} /></Button>
            <Button variant="ghost" onClick={() => exportarAsistencia().catch(e => alert(e.message))}><Download size={14} /> Exportar</Button>
          </div>
        </div>
        <Table head={['Alumno', 'Grado', 'Fecha', 'Entrada', 'Salida', 'Estado']}>
          {alumnos.map(a => (
            <Tr key={a.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar nombre={`${a.nombres} ${a.apellidos}`} size="sm" />
                  <span className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</span>
                </div>
              </Td>
              <Td><Mono>{a.grado} "{a.seccion}"</Mono></Td>
              <Td><Mono>30 JUL 2026</Mono></Td>
              <Td><Mono className="font-semibold !text-ink">{a.entradaHoy ?? '—'}</Mono></Td>
              <Td><Mono className="font-semibold !text-ink">{a.salidaHoy ?? '—'}</Mono></Td>
              <Td><EstadoBadge estado={a.estadoHoy} /></Td>
            </Tr>
          ))}
        </Table>
      </div>
    </>
  );
}
