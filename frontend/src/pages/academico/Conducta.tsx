import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Award, AlertTriangle, Trash2, Flag } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill, Button, FilterTabs, StatCard } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import Paginacion from '../../components/Paginacion';
import { getConductaPagina, registrarConducta, eliminarConducta, getAlumnos, type DatosConducta } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import type { ConductaApi, Alumno } from '../../types';

const CATEGORIAS_MERITO = ['Representación', 'Buen desempeño', 'Solidaridad', 'Puntualidad', 'Participación'];
const CATEGORIAS_DEMERITO = ['Tardanza reiterada', 'Falta de materiales', 'Indisciplina', 'Uso de celular', 'Agresión verbal'];

const VACIO: DatosConducta = { alumnoId: 0, tipo: 'MERITO', categoria: '', descripcion: '', fecha: null };

const TIPO_POR_TAB: Record<string, string | undefined> = { Méritos: 'MERITO', Observaciones: 'DEMERITO' };

export default function Conducta() {
  const { usuario } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const puedeRegistrar = ['admin', 'direccion', 'profesor'].includes(usuario?.rol ?? '');
  const puedeEliminar = ['admin', 'direccion'].includes(usuario?.rol ?? '');

  const [lista, setLista] = useState<ConductaApi[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [tab, setTab] = useState('Todos');
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<DatosConducta>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await getConductaPagina({ tipo: TIPO_POR_TAB[tab], pagina, tamano: 50 });
      setLista(r.contenido);
      setTotalPaginas(r.totalPaginas);
      setTotal(r.total);
    } catch { /* sin conexión */ } finally {
      setCargando(false);
    }
  }, [tab, pagina]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (puedeRegistrar) getAlumnos().then(setAlumnos).catch(() => {}); }, [puedeRegistrar]);

  function cambiarTab(t: string) { setTab(t); setPagina(0); }

  function abrirNuevo() {
    setDatos({ ...VACIO, alumnoId: Number(alumnos[0]?.id ?? 0) });
    setErrorForm(null);
    setAbierto(true);
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      await registrarConducta({ ...datos, fecha: datos.fecha || null });
      setAbierto(false);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(c: ConductaApi) {
    if (!(await confirmar({
      titulo: `¿Eliminar este registro de ${c.alumno}?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
    }))) return;
    try {
      await eliminarConducta(c.id);
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  // El servidor ya filtra por tipo (ver TIPO_POR_TAB): "lista" ya viene acotada.
  // Méritos/Observaciones solo son exactos cuando todo cabe en una página; con
  // más de una, se aclara "en esta página" en vez de mostrar un total falso.
  const meritos = lista.filter(c => c.tipo === 'MERITO').length;
  const deméritos = lista.filter(c => c.tipo === 'DEMERITO').length;
  const categorias = datos.tipo === 'MERITO' ? CATEGORIAS_MERITO : CATEGORIAS_DEMERITO;
  const formValido = datos.alumnoId > 0 && datos.categoria.trim() !== '' && datos.descripcion.trim() !== '';

  return (
    <>
      <Topbar title="Conducta" subtitle="Méritos y observaciones registradas" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard icon={<Award size={19} strokeWidth={1.7} />} label="Méritos"
            value={String(meritos)} note={totalPaginas > 1 ? 'En esta página' : 'Reconocimientos otorgados'} noteTone="ok" />
          <StatCard icon={<AlertTriangle size={19} strokeWidth={1.7} />} label="Observaciones"
            value={String(deméritos)} note={totalPaginas > 1 ? 'En esta página' : 'Incidencias registradas'} noteTone="warn" />
          <StatCard icon={<Flag size={19} strokeWidth={1.7} />} label="Total"
            value={String(total)} note="Registros históricos" noteTone="neutral" />
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={['Todos', 'Méritos', 'Observaciones']} active={tab} onChange={cambiarTab} />
          {puedeRegistrar && (
            <Button onClick={abrirNuevo} disabled={alumnos.length === 0}>
              <Plus size={14} /> Registrar
            </Button>
          )}
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : lista.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">
              {total === 0 ? 'Aún no hay registros de conducta' : 'Nada en este filtro'}
            </p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              {puedeRegistrar
                ? 'Al registrar un mérito u observación, los apoderados reciben una notificación.'
                : 'Aquí aparecerán los reconocimientos y observaciones.'}
            </p>
          </div>
        ) : (
          <Table head={['Estudiante', 'Tipo', 'Categoría', 'Descripción', 'Fecha', '']}>
            {lista.map(c => (
              <Tr key={c.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={c.alumno} size="sm" />
                    <div className="leading-tight">
                      <p className="font-semibold text-[13px]">{c.alumno}</p>
                      <Mono className="!text-[10.5px]">{c.codigoAlumno} · {c.aula}</Mono>
                    </div>
                  </div>
                </Td>
                <Td>
                  {c.tipo === 'MERITO'
                    ? <Pill tone="ok"><Award size={11} /> Mérito</Pill>
                    : <Pill tone="warn"><AlertTriangle size={11} /> Observación</Pill>}
                </Td>
                <Td className="text-[12.5px] font-medium">{c.categoria}</Td>
                <Td className="text-[12.5px] text-ink-2 max-w-[280px]">{c.descripcion}</Td>
                <Td><Mono className="!text-[11px]">{c.fecha}</Mono></Td>
                <Td>
                  {puedeEliminar && (
                    <button onClick={() => eliminar(c)} title="Eliminar"
                      className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer ml-auto">
                      <Trash2 size={13} />
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}

        <Paginacion pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
      </div>

      <Modal
        abierto={abierto}
        titulo="Registrar conducta"
        subtitulo="Los apoderados del estudiante recibirán una notificación"
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Registrar
            </Button>
          </>
        }
      >
        {errorForm && (
          <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
        )}

        <Campo etiqueta="Estudiante" requerido>
          <select className={claseInput} value={datos.alumnoId}
            onChange={e => setDatos({ ...datos, alumnoId: Number(e.target.value) })}>
            {alumnos.map(a => (
              <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} · {a.grado} "{a.seccion}"</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Tipo" requerido>
          <div className="flex gap-2">
            {[
              { id: 'MERITO', label: 'Mérito', icon: <Award size={14} /> },
              { id: 'DEMERITO', label: 'Observación', icon: <AlertTriangle size={14} /> },
            ].map(t => (
              <button key={t.id}
                onClick={() => setDatos({ ...datos, tipo: t.id, categoria: '' })}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-[10px] border px-3 py-2.5 text-[12.5px] font-semibold transition-colors cursor-pointer ${
                  datos.tipo === t.id ? 'border-brand bg-brand-faint text-brand' : 'border-line text-ink-2 hover:border-line-2'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Categoría" requerido>
          <select className={claseInput} value={datos.categoria}
            onChange={e => setDatos({ ...datos, categoria: e.target.value })}>
            <option value="">Selecciona una categoría…</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>

        <Campo etiqueta="Descripción" requerido>
          <textarea className={`${claseInput} min-h-[90px] resize-y`} value={datos.descripcion}
            onChange={e => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="Describe brevemente lo ocurrido…" />
        </Campo>

        <Campo etiqueta="Fecha">
          <input type="date" className={claseInput} value={datos.fecha ?? ''}
            onChange={e => setDatos({ ...datos, fecha: e.target.value })} />
          <p className="text-[11px] text-ink-3 mt-1.5">Si lo dejas vacío se usa la fecha de hoy.</p>
        </Campo>
      </Modal>
    </>
  );
}
