import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Pencil, UserMinus, KeyRound, Mail, Phone, RefreshCw } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill, Button } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import CodigoActivacionModal from '../../components/CodigoActivacionModal';
import TelefonoInput from '../../components/TelefonoInput';
import { getDocentes, getAulas, crearDocente, actualizarDocente, cesarDocente, reenviarCodigoUsuario, type DatosDocente } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import type { DocenteApi, Aula } from '../../types';

const VACIO: DatosDocente = {
  nombres: '', apellidos: '', correo: '', dni: '', telefono: '',
  especialidad: '', aulaIds: [], aulaTutoriaId: null,
};

export default function Docentes() {
  const { usuario } = useAuth();
  const confirmar = useConfirm();
  const toast = useToast();
  const esAdmin = usuario?.rol === 'admin';

  const [docentes, setDocentes] = useState<DocenteApi[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigoMostrado, setCodigoMostrado] = useState<{ nombre: string; codigo: string } | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<DocenteApi | null>(null);
  const [datos, setDatos] = useState<DatosDocente>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDocentes(await getDocentes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { getAulas().then(setAulas).catch(() => {}); }, []);

  function abrirNuevo() {
    setEditando(null);
    setDatos(VACIO);
    setErrorForm(null);
    setAbierto(true);
  }

  async function reenviar(d: DocenteApi) {
    try {
      const actualizado = await reenviarCodigoUsuario(d.usuarioId);
      await cargar();
      setCodigoMostrado({ nombre: `${d.nombres} ${d.apellidos}`, codigo: actualizado.codigoActivacion ?? '' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo reemitir el código');
    }
  }

  function abrirEdicion(d: DocenteApi) {
    setEditando(d);
    setDatos({
      nombres: d.nombres, apellidos: d.apellidos, correo: d.correo,
      dni: d.dni ?? '', telefono: d.telefono ?? '', especialidad: d.especialidad ?? '',
      aulaIds: d.aulas.map(a => a.id),
      aulaTutoriaId: d.aulas.find(a => a.esTutor)?.id ?? null,
    });
    setErrorForm(null);
    setAbierto(true);
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      const cuerpo: DatosDocente = {
        ...datos,
        dni: datos.dni?.trim() || null,
        telefono: datos.telefono?.trim() || null,
        especialidad: datos.especialidad?.trim() || null,
      };
      if (editando) await actualizarDocente(editando.id, cuerpo);
      else await crearDocente(cuerpo);
      setAbierto(false);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function cesar(d: DocenteApi) {
    if (!(await confirmar({
      titulo: `¿Cesar a ${d.nombres} ${d.apellidos}?`,
      mensaje: 'Perderá el acceso al sistema y se liberarán sus aulas. Su historial de notas y conducta se conserva.',
      textoConfirmar: 'Cesar',
    }))) return;
    try {
      await cesarDocente(d.id);
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo cesar al docente');
    }
  }

  function alternarAula(id: number) {
    const yaEsta = datos.aulaIds.includes(id);
    const aulaIds = yaEsta ? datos.aulaIds.filter(x => x !== id) : [...datos.aulaIds, id];
    setDatos({
      ...datos,
      aulaIds,
      aulaTutoriaId: yaEsta && datos.aulaTutoriaId === id ? null : datos.aulaTutoriaId,
    });
  }

  const activos = docentes.filter(d => d.estado === 'ACTIVO').length;
  const pendientes = docentes.filter(d => d.estadoCuenta === 'PENDIENTE').length;
  const formValido = datos.nombres.trim() !== '' && datos.apellidos.trim() !== '' && datos.correo.trim() !== '';

  return (
    <>
      <Topbar
        title="Docentes"
        subtitle={cargando ? 'Cargando…' : `${docentes.length} registrados · ${activos} activos${pendientes ? ` · ${pendientes} sin activar cuenta` : ''}`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {esAdmin && (
          <div className="flex justify-end">
            <Button onClick={abrirNuevo}><Plus size={14} /> Registrar docente</Button>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : docentes.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Aún no hay docentes registrados</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              Al registrar un docente recibirá un código para activar su cuenta y establecer su contraseña.
            </p>
            {esAdmin && (
              <div className="mt-5 flex justify-center">
                <Button onClick={abrirNuevo}><Plus size={14} /> Registrar docente</Button>
              </div>
            )}
          </div>
        ) : (
          <Table head={['Docente', 'Contacto', 'Especialidad', 'Aulas asignadas', 'Cuenta', '']}>
            {docentes.map(d => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${d.nombres} ${d.apellidos}`} fotoUrl={d.fotoUrl} />
                    <div className="leading-tight">
                      <p className="font-semibold text-[13px]">{d.nombres} {d.apellidos}</p>
                      <Mono className="!text-[10.5px]">{d.dni ? `DNI ${d.dni}` : 'Sin DNI'}</Mono>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="leading-tight">
                    <p className="flex items-center gap-1.5 text-[12px] text-ink-2"><Mail size={11} /> {d.correo}</p>
                    {d.telefono && <p className="flex items-center gap-1.5 text-[12px] text-ink-3 mt-0.5"><Phone size={11} /> {d.telefono}</p>}
                  </div>
                </Td>
                <Td className="text-[12.5px] text-ink-2">{d.especialidad ?? '—'}</Td>
                <Td>
                  {d.aulas.length === 0 ? (
                    <Mono className="!text-ink-3">— sin aulas —</Mono>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {d.aulas.map(a => (
                        <Pill key={a.id} tone={a.esTutor ? 'brand' : 'neutral'}>
                          {a.etiqueta}{a.esTutor ? ' · tutor' : ''}
                        </Pill>
                      ))}
                    </div>
                  )}
                </Td>
                <Td>
                  {d.estado === 'CESADO' ? (
                    <Pill tone="bad">Cesado</Pill>
                  ) : d.estadoCuenta === 'ACTIVO' ? (
                    <Pill tone="ok">Activa</Pill>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Pill tone="warn">Pendiente</Pill>
                      {d.codigoActivacion && (
                        <span className="inline-flex items-center gap-1 rounded-[8px] border border-line bg-canvas px-2 py-1">
                          <KeyRound size={11} className="text-ink-3" />
                          <Mono className="!text-[11px] font-semibold !text-ink">{d.codigoActivacion}</Mono>
                        </span>
                      )}
                      <button onClick={() => reenviar(d)} title="Reemitir código"
                        className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  )}
                </Td>
                <Td>
                  {esAdmin && d.estado !== 'CESADO' && (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => abrirEdicion(d)} title="Editar"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => cesar(d)} title="Cesar"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer">
                        <UserMinus size={13} />
                      </button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal
        abierto={abierto}
        titulo={editando ? 'Editar docente' : 'Registrar docente'}
        subtitulo={editando ? undefined : 'Recibirá un código para activar su cuenta y crear su contraseña'}
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null}
              {editando ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </>
        }
      >
        {errorForm && (
          <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Nombres" requerido>
            <input className={claseInput} value={datos.nombres} autoFocus
              onChange={e => setDatos({ ...datos, nombres: e.target.value })} placeholder="Carlos" />
          </Campo>
          <Campo etiqueta="Apellidos" requerido>
            <input className={claseInput} value={datos.apellidos}
              onChange={e => setDatos({ ...datos, apellidos: e.target.value })} placeholder="Mendoza Silva" />
          </Campo>
        </div>

        <Campo etiqueta="Correo institucional" requerido>
          <input className={claseInput} type="email" maxLength={160} value={datos.correo}
            onChange={e => setDatos({ ...datos, correo: e.target.value })}
            placeholder="c.mendoza@colegio.edu.pe" />
        </Campo>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="DNI">
            <input className={`${claseInput} font-mono`} value={datos.dni ?? ''} inputMode="numeric"
              onChange={e => setDatos({ ...datos, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              placeholder="8 dígitos" />
          </Campo>
          <Campo etiqueta="Teléfono">
            <TelefonoInput value={datos.telefono ?? ''}
              onChange={v => setDatos({ ...datos, telefono: v })} placeholder="999 888 777" />
          </Campo>
        </div>

        <Campo etiqueta="Especialidad">
          <input className={claseInput} value={datos.especialidad ?? ''}
            onChange={e => setDatos({ ...datos, especialidad: e.target.value })} placeholder="Matemática" />
        </Campo>

        <Campo etiqueta="Aulas asignadas">
          {aulas.length === 0 ? (
            <p className="text-[12px] text-ink-3">Primero crea aulas en el módulo Aulas.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {aulas.map(a => {
                  const activa = datos.aulaIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => alternarAula(a.id)}
                      className={`rounded-[9px] border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                        activa ? 'border-brand bg-brand-faint text-brand' : 'border-line text-ink-2 hover:border-line-2'}`}
                    >
                      {a.etiqueta}
                    </button>
                  );
                })}
              </div>
              {datos.aulaIds.length > 0 && (
                <div className="mt-3">
                  <span className="label-mono">Aula donde es tutor</span>
                  <select
                    className={`${claseInput} mt-1.5`}
                    value={datos.aulaTutoriaId ?? ''}
                    onChange={e => setDatos({ ...datos, aulaTutoriaId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">Ninguna</option>
                    {aulas.filter(a => datos.aulaIds.includes(a.id)).map(a => (
                      <option key={a.id} value={a.id}>{a.etiqueta}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </Campo>
      </Modal>

      <CodigoActivacionModal
        abierto={!!codigoMostrado}
        nombre={codigoMostrado?.nombre ?? ''}
        codigo={codigoMostrado?.codigo ?? ''}
        onCerrar={() => setCodigoMostrado(null)}
      />
    </>
  );
}
