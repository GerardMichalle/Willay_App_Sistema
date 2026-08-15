import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Pencil, Trash2, School } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Mono, Pill, Button, PanelHead } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import { getAulas, crearAula, actualizarAula, desactivarAula, type DatosAula } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Aula } from '../../types';

const NIVELES = ['INICIAL', 'PRIMARIA', 'SECUNDARIA'];

export default function Aulas() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const anioActual = new Date().getFullYear();

  const VACIO: DatosAula = { nivel: 'PRIMARIA', grado: '', seccion: '', anioEscolar: anioActual };

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Aula | null>(null);
  const [datos, setDatos] = useState<DatosAula>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setAulas(await getAulas());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las aulas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  function abrirNuevo() {
    setEditando(null);
    setDatos(VACIO);
    setErrorForm(null);
    setAbierto(true);
  }

  function abrirEdicion(a: Aula) {
    setEditando(a);
    setDatos({ nivel: a.nivel, grado: a.grado, seccion: a.seccion, anioEscolar: a.anioEscolar });
    setErrorForm(null);
    setAbierto(true);
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      if (editando) await actualizarAula(editando.id, datos);
      else await crearAula(datos);
      setAbierto(false);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(a: Aula) {
    if (!confirm(`¿Desactivar el aula ${a.etiqueta}?`)) return;
    try {
      await desactivarAula(a.id);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo desactivar');
    }
  }

  const porNivel = NIVELES
    .map(n => ({ nivel: n, aulas: aulas.filter(a => a.nivel === n) }))
    .filter(g => g.aulas.length > 0);

  const totalAlumnos = aulas.reduce((s, a) => s + a.totalAlumnos, 0);
  const formValido = datos.grado.trim() !== '' && datos.seccion.trim() !== '';

  return (
    <>
      <Topbar
        title="Aulas"
        subtitle={cargando ? 'Cargando…' : `${aulas.length} aulas activas · ${totalAlumnos} estudiantes distribuidos`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {esAdmin && (
          <div className="flex justify-end">
            <Button onClick={abrirNuevo}><Plus size={14} /> Nueva aula</Button>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : aulas.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4"><School size={22} /></span>
            <p className="text-[14px] font-semibold">Aún no hay aulas creadas</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[380px] mx-auto">
              Las aulas son el primer paso: sin ellas no puedes matricular estudiantes ni asignar docentes.
            </p>
            {esAdmin && (
              <div className="mt-5 flex justify-center">
                <Button onClick={abrirNuevo}><Plus size={14} /> Crear la primera aula</Button>
              </div>
            )}
          </div>
        ) : (
          porNivel.map(grupo => (
            <div key={grupo.nivel} className="card p-6">
              <PanelHead
                title={grupo.nivel.charAt(0) + grupo.nivel.slice(1).toLowerCase()}
                sub={`${grupo.aulas.length} aulas`}
              />
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {grupo.aulas.map(a => (
                  <div key={a.id} className="rounded-[12px] border border-line p-4 hover:border-line-2 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-bold tracking-tight">{a.etiqueta}</p>
                        <Mono className="!text-[10.5px]">Año {a.anioEscolar}</Mono>
                      </div>
                      {esAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEdicion(a)} title="Editar"
                            className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => eliminar(a)} title="Desactivar"
                            className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <Pill tone={a.totalAlumnos > 0 ? 'ok' : 'neutral'}>
                        {a.totalAlumnos} {a.totalAlumnos === 1 ? 'estudiante' : 'estudiantes'}
                      </Pill>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        abierto={abierto}
        titulo={editando ? 'Editar aula' : 'Nueva aula'}
        subtitulo="Cada aula pertenece a un nivel, grado, sección y año escolar"
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null}
              {editando ? 'Guardar cambios' : 'Crear aula'}
            </Button>
          </>
        }
      >
        {errorForm && (
          <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
        )}

        <Campo etiqueta="Nivel" requerido>
          <select className={claseInput} value={datos.nivel}
            onChange={e => setDatos({ ...datos, nivel: e.target.value })}>
            {NIVELES.map(n => (
              <option key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </Campo>

        <div className="grid sm:grid-cols-3 gap-x-4">
          <Campo etiqueta="Grado" requerido>
            <input className={claseInput} value={datos.grado} autoFocus
              onChange={e => setDatos({ ...datos, grado: e.target.value })} placeholder="5" />
          </Campo>
          <Campo etiqueta="Sección" requerido>
            <input className={claseInput} value={datos.seccion}
              onChange={e => setDatos({ ...datos, seccion: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="A" />
          </Campo>
          <Campo etiqueta="Año escolar" requerido>
            <input type="number" className={claseInput} value={datos.anioEscolar}
              onChange={e => setDatos({ ...datos, anioEscolar: Number(e.target.value) })} />
          </Campo>
        </div>

        <p className="text-[11.5px] text-ink-3">
          Resultado: <b className="text-ink font-semibold">{datos.grado || '—'}° "{datos.seccion || '—'}"</b> · {datos.nivel.toLowerCase()} · {datos.anioEscolar}
        </p>
      </Modal>
    </>
  );
}
