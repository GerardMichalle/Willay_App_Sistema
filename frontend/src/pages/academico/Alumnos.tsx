import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, CreditCard, ArrowRight, Loader2, Pencil, UserMinus, Search, KeyRound, CheckCircle2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, EstadoBadge, Mono, Pill, FilterTabs, Button } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import {
  getAlumnos, getAulas, crearAlumno, actualizarAlumno, retirarAlumno, exportarAlumnos,
  crearCuentaAlumno, type DatosAlumno,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno, Aula } from '../../types';

const TABS = ['Todos', 'Puntuales', 'Tardanzas', 'Ausentes', 'Sin tarjeta'];

const VACIO: DatosAlumno = { nombres: '', apellidos: '', dni: '', fechaNacimiento: '', aulaId: 0, tarjetaRfid: '' };

export default function Alumnos() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [tab, setTab] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Alumno | null>(null);
  const [datos, setDatos] = useState<DatosAlumno>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // Crear cuenta web para un alumno ya matriculado que no la tiene
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [dniCuenta, setDniCuenta] = useState('');
  const [creandoCuenta, setCreandoCuenta] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);

  const cargar = useCallback(async (q?: string) => {
    setCargando(true);
    setError(null);
    try {
      setAlumnos(await getAlumnos(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { if (esAdmin) getAulas().then(setAulas).catch(() => {}); }, [esAdmin]);

  // Búsqueda con retardo: no golpea el backend en cada tecla
  useEffect(() => {
    const t = setTimeout(() => void cargar(busqueda || undefined), busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  function abrirNuevo() {
    setEditando(null);
    setDatos({ ...VACIO, aulaId: aulas[0]?.id ?? 0 });
    setErrorForm(null);
    reiniciarCuenta();
    setAbierto(true);
  }

  function abrirEdicion(a: Alumno) {
    setEditando(a);
    setDatos({
      nombres: a.nombres,
      apellidos: a.apellidos,
      dni: a.dni ?? '',
      fechaNacimiento: a.fechaNacimiento || '',
      aulaId: a.aulaId ?? aulas[0]?.id ?? 0,
      tarjetaRfid: a.tarjetaRfid ?? '',
    });
    setErrorForm(null);
    reiniciarCuenta();
    setAbierto(true);
  }

  function reiniciarCuenta() {
    setCorreoCuenta('');
    setDniCuenta('');
    setErrorCuenta(null);
    setCodigoGenerado(null);
  }

  async function crearCuentaWeb() {
    if (!editando) return;
    setErrorCuenta(null);
    setCreandoCuenta(true);
    try {
      const r = await crearCuentaAlumno(editando.id, correoCuenta.trim(), editando.dni ? null : dniCuenta.trim());
      setCodigoGenerado(r.codigoActivacion);
      await cargar(busqueda || undefined);
    } catch (e) {
      setErrorCuenta(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setCreandoCuenta(false);
    }
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      const cuerpo: DatosAlumno = {
        ...datos,
        dni: datos.dni?.trim() || null,
        fechaNacimiento: datos.fechaNacimiento || null,
        tarjetaRfid: datos.tarjetaRfid?.trim() || null,
      };
      if (editando) await actualizarAlumno(editando.id, cuerpo);
      else await crearAlumno(cuerpo);
      setAbierto(false);
      await cargar(busqueda || undefined);
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function darDeBaja(a: Alumno) {
    if (!confirm(`¿Dar de baja a ${a.nombres} ${a.apellidos}?\n\nSe conservará todo su historial de asistencia y notas.`)) return;
    try {
      await retirarAlumno(a.id);
      await cargar(busqueda || undefined);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo dar de baja');
    }
  }

  const filtrados = alumnos.filter(a => {
    if (a.estado === 'RETIRADO') return false;
    if (tab === 'Puntuales') return a.estadoHoy === 'puntual';
    if (tab === 'Tardanzas') return a.estadoHoy === 'tardanza';
    if (tab === 'Ausentes') return a.estadoHoy === 'ausente';
    if (tab === 'Sin tarjeta') return !a.tarjetaRfid;
    return true;
  });

  const conTarjeta = alumnos.filter(a => a.tarjetaRfid).length;
  const formValido = datos.nombres.trim() !== '' && datos.apellidos.trim() !== '' && datos.aulaId > 0;

  return (
    <>
      <Topbar
        title="Alumnos"
        subtitle={cargando ? 'Cargando…' : `${alumnos.length} registrados · ${conTarjeta} tarjetas vinculadas`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={TABS} active={tab} onChange={setTab} />
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o código…"
                className="w-[230px] rounded-[10px] border border-line bg-paper pl-9 pr-3 py-2 text-[12.5px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
              />
            </div>
            <Button variant="ghost" onClick={() => exportarAlumnos().catch(e => alert(e.message))}>
              <Download size={14} /> Exportar
            </Button>
            {esAdmin && <Button onClick={abrirNuevo}><Plus size={14} /> Registrar alumno</Button>}
          </div>
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">
              {alumnos.length === 0 ? 'Aún no hay estudiantes registrados' : 'Ningún estudiante coincide con el filtro'}
            </p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              {alumnos.length === 0 && esAdmin
                ? 'Registra el primero o impórtalos masivamente desde Matrículas.'
                : 'Prueba con otro filtro o búsqueda.'}
            </p>
            {alumnos.length === 0 && esAdmin && (
              <div className="mt-5 flex justify-center">
                <Button onClick={abrirNuevo}><Plus size={14} /> Registrar alumno</Button>
              </div>
            )}
          </div>
        ) : (
          <Table head={['Alumno', 'Código', 'Grado', 'Tarjeta RFID', 'Entrada / salida', 'Estado hoy', '']}>
            {filtrados.map(a => (
              <Tr key={a.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} />
                    <div className="leading-tight">
                      <p className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</p>
                      <Mono className="!text-[10.5px]">Apod. {a.apoderado} · {a.telefonoApoderado}</Mono>
                    </div>
                  </div>
                </Td>
                <Td><Mono>{a.codigo}</Mono></Td>
                <Td><Mono>{a.grado} "{a.seccion}"</Mono></Td>
                <Td>
                  {a.tarjetaRfid ? (
                    <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-canvas px-2.5 py-1">
                      <CreditCard size={12} className="text-ink-3" />
                      <Mono className="!text-[11px]">{a.tarjetaRfid}</Mono>
                    </span>
                  ) : esAdmin ? (
                    <button
                      onClick={() => abrirEdicion(a)}
                      className="text-[11.5px] font-semibold text-brand hover:text-brand-strong cursor-pointer"
                    >
                      + Vincular tarjeta
                    </button>
                  ) : (
                    <Mono className="!text-ink-3">— sin tarjeta —</Mono>
                  )}
                </Td>
                <Td>
                  {a.entradaHoy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Mono className="font-semibold !text-ink">{a.entradaHoy}</Mono>
                      <ArrowRight size={11} className="text-ink-3" />
                      <Mono className="font-semibold !text-ink">{a.salidaHoy ?? '—'}</Mono>
                    </span>
                  ) : (
                    <Mono className="!text-ink-3">— sin registro —</Mono>
                  )}
                </Td>
                <Td><EstadoBadge estado={a.estadoHoy} /></Td>
                <Td>
                  {esAdmin && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => abrirEdicion(a)}
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => darDeBaja(a)}
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer"
                        title="Dar de baja"
                      >
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
        titulo={editando ? 'Editar estudiante' : 'Registrar estudiante'}
        subtitulo={editando ? `Código ${editando.codigo}` : 'El código se genera automáticamente al guardar'}
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
            <input
              className={claseInput}
              value={datos.nombres}
              onChange={e => setDatos({ ...datos, nombres: e.target.value })}
              placeholder="Valeria"
              autoFocus
            />
          </Campo>
          <Campo etiqueta="Apellidos" requerido>
            <input
              className={claseInput}
              value={datos.apellidos}
              onChange={e => setDatos({ ...datos, apellidos: e.target.value })}
              placeholder="Quispe Rojas"
            />
          </Campo>
          <Campo etiqueta="DNI">
            <input
              className={`${claseInput} font-mono`}
              value={datos.dni ?? ''}
              onChange={e => setDatos({ ...datos, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
              placeholder="8 dígitos"
              inputMode="numeric"
            />
          </Campo>
          <Campo etiqueta="Fecha de nacimiento">
            <input
              type="date"
              className={claseInput}
              value={datos.fechaNacimiento ?? ''}
              onChange={e => setDatos({ ...datos, fechaNacimiento: e.target.value })}
            />
          </Campo>
        </div>

        <Campo etiqueta="Aula" requerido>
          <select
            className={claseInput}
            value={datos.aulaId}
            onChange={e => setDatos({ ...datos, aulaId: Number(e.target.value) })}
          >
            {aulas.length === 0 && <option value={0}>No hay aulas registradas</option>}
            {aulas.map(au => (
              <option key={au.id} value={au.id}>
                {au.etiqueta} · {au.nivel.toLowerCase()} ({au.totalAlumnos} alumnos)
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Tarjeta RFID">
          <input
            className={`${claseInput} font-mono`}
            value={datos.tarjetaRfid ?? ''}
            onChange={e => setDatos({ ...datos, tarjetaRfid: e.target.value.toUpperCase() })}
            placeholder="RF-88213"
          />
          <p className="text-[11px] text-ink-3 mt-1.5">
            Opcional. Puedes vincularla después, cuando entregues la tarjeta física.
          </p>
        </Campo>

        {/* ── Cuenta web: solo tiene sentido para un alumno ya matriculado ── */}
        {editando && (
          <div className="border-t border-line pt-4 mt-1">
            <p className="label-mono mb-3">Cuenta web del estudiante</p>

            {editando.estadoCuenta ? (
              <div className="flex items-center gap-2.5">
                <Pill tone={editando.estadoCuenta === 'ACTIVO' ? 'ok' : editando.estadoCuenta === 'SUSPENDIDO' ? 'bad' : 'warn'}>
                  {editando.estadoCuenta === 'ACTIVO' ? 'Activa'
                    : editando.estadoCuenta === 'SUSPENDIDO' ? 'Suspendida' : 'Pendiente de activar'}
                </Pill>
                {editando.estadoCuenta === 'PENDIENTE' && (
                  <p className="text-[11.5px] text-ink-3">Gestiona el código de activación desde Sistema → Usuarios.</p>
                )}
              </div>
            ) : codigoGenerado ? (
              <div className="rounded-[10px] border border-line bg-canvas p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <span className="flex items-center gap-2 text-ok text-[12.5px] font-semibold">
                  <CheckCircle2 size={16} /> Cuenta creada
                </span>
                <Mono className="font-bold !text-brand !text-[16px] tracking-widest">{codigoGenerado}</Mono>
              </div>
            ) : (
              <>
                {errorCuenta && (
                  <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorCuenta}</p>
                )}
                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Campo etiqueta="Correo del estudiante" requerido>
                    <input type="email" className={claseInput} maxLength={160} value={correoCuenta}
                      onChange={e => setCorreoCuenta(e.target.value)} placeholder="valeria@gmail.com" />
                  </Campo>
                  {!editando.dni && (
                    <Campo etiqueta="DNI del estudiante" requerido>
                      <input className={`${claseInput} font-mono`} inputMode="numeric" value={dniCuenta}
                        onChange={e => setDniCuenta(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="8 dígitos" />
                    </Campo>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[11px] text-ink-3 max-w-[280px]">
                    Se emitirá un código de activación de un solo uso para que el estudiante cree su contraseña.
                  </p>
                  <Button variant="ghost" onClick={crearCuentaWeb}
                    disabled={creandoCuenta || !correoCuenta.trim() || (!editando.dni && !/^\d{8}$/.test(dniCuenta))}>
                    {creandoCuenta ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                    Crear cuenta
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
