import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Loader2, Building2, Power, Users, GraduationCap, CheckCircle2, Circle, Copy, ClipboardList, Activity, History, Trash2, StickyNote, Megaphone, Camera, X } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, Mono, Pill, Button, PanelHead } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import {
  getColegios, crearColegio, cambiarEstadoColegio, getChecklistColegio, getMetricasColegio, getSaludSistema,
  getNotasColegio, crearNotaColegio, eliminarNotaColegio, actualizarPagoColegio, enviarComunicadoGlobal,
  getComunicadosGlobales, eliminarComunicadoGlobal, subirLogoColegio, type DatosColegio,
} from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useEnlaceArchivo } from '../../hooks/useEnlaceArchivo';
import type { ColegioApi, ChecklistColegioApi, MetricasColegioApi, NotaInternaApi, ComunicadoGlobalApi } from '../../types';

/** Logo grande y prominente de la tarjeta, con control para subirlo o cambiarlo. */
function LogoColegioGrande({ colegio, onSubido }: { colegio: ColegioApi; onSubido: (actualizado: ColegioApi) => void }) {
  const url = useEnlaceArchivo(colegio.logoUrl);
  const [subiendo, setSubiendo] = useState(false);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  async function cambiar(archivo: File | null) {
    if (!archivo) return;
    setSubiendo(true);
    try {
      onSubido(await subirLogoColegio(colegio.id, archivo));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir el logo');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="relative shrink-0">
      {url ? (
        <img src={url} alt={colegio.nombre} className="w-16 h-16 rounded-2xl object-cover border border-line" />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-brand-soft text-brand grid place-items-center border border-line">
          <Building2 size={26} strokeWidth={1.7} />
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="absolute -bottom-1.5 -right-1.5 grid place-items-center w-6 h-6 rounded-full bg-paper border border-line text-ink-2 shadow-sm hover:text-brand hover:border-brand transition-colors cursor-pointer disabled:opacity-50"
        title="Cambiar logo"
      >
        {subiendo ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
      </button>
      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { void cambiar(e.target.files?.[0] ?? null); e.target.value = ''; }}
      />
    </div>
  );
}

const VACIO: DatosColegio = {
  nombre: '', codigoModular: '', ruc: '', colorMarca: '#E02D2D',
  sedeNombre: 'Sede Central', sedeDireccion: '',
  adminNombres: '', adminApellidos: '', adminCorreo: '',
  adminDni: '', adminTelefono: '', adminPasswordTemporal: '',
};

const PAGO_INFO: Record<string, { etiqueta: string; tono: 'ok' | 'warn' | 'bad' }> = {
  AL_DIA: { etiqueta: 'Al día', tono: 'ok' },
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'warn' },
  VENCIDO: { etiqueta: 'Vencido', tono: 'bad' },
};

/** Genera una contraseña temporal legible para dictarla por teléfono. */
function claveTemporal() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numeros = '23456789';
  const azar = (s: string) => s[Math.floor(Math.random() * s.length)];
  return Array.from({ length: 4 }, () => azar(letras)).join('')
       + Array.from({ length: 4 }, () => azar(numeros)).join('');
}

export default function Colegios() {
  const confirmar = useConfirm();
  const toast = useToast();
  const [colegios, setColegios] = useState<ColegioApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<DatosColegio>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ colegio: ColegioApi; correo: string; clave: string } | null>(null);

  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<ChecklistColegioApi | null>(null);
  const [metricas, setMetricas] = useState<MetricasColegioApi | null>(null);
  const [notas, setNotas] = useState<NotaInternaApi[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [formPagoEstado, setFormPagoEstado] = useState('AL_DIA');
  const [formPagoFecha, setFormPagoFecha] = useState('');
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [saludOk, setSaludOk] = useState<boolean | null>(null);
  const [ultimaVerificacion, setUltimaVerificacion] = useState<Date | null>(null);

  const [comunicadoAbierto, setComunicadoAbierto] = useState(false);
  const [comunicadoTitulo, setComunicadoTitulo] = useState('');
  const [comunicadoMensaje, setComunicadoMensaje] = useState('');
  const [enviandoComunicado, setEnviandoComunicado] = useState(false);
  const [historialComunicados, setHistorialComunicados] = useState<ComunicadoGlobalApi[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setColegios(await getColegios());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los colegios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  // Verifica cada 60s mientras la pantalla esté abierta, para detectar una
  // caída sin tener que entrar por SSH a revisar logs.
  useEffect(() => {
    let vivo = true;
    const verificar = () => {
      getSaludSistema()
        .then(ok => { if (vivo) { setSaludOk(ok); setUltimaVerificacion(new Date()); } })
        .catch(() => { if (vivo) { setSaludOk(false); setUltimaVerificacion(new Date()); } });
    };
    verificar();
    const id = setInterval(verificar, 60_000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  function abrirNuevo() {
    setDatos({ ...VACIO, adminPasswordTemporal: claveTemporal() });
    setErrorForm(null);
    setCreado(null);
    setAbierto(true);
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      const colegio = await crearColegio(datos);
      setCreado({ colegio, correo: datos.adminCorreo, clave: datos.adminPasswordTemporal });
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo crear el colegio');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(c: ColegioApi) {
    const accion = c.activo ? 'suspender' : 'reactivar';
    if (!(await confirmar({
      titulo: `¿Seguro que deseas ${accion} ${c.nombre}?`,
      mensaje: c.activo
        ? 'Sus usuarios no podrán iniciar sesión. Todos los datos se conservan.'
        : 'Sus usuarios recuperarán el acceso.',
      textoConfirmar: c.activo ? 'Suspender' : 'Reactivar',
    }))) return;
    try {
      await cambiarEstadoColegio(c.id, !c.activo);
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  }

  async function abrirDetalle(id: number) {
    setDetalleId(id);
    setChecklist(null);
    setMetricas(null);
    setNotas([]);
    setNuevaNota('');
    const colegio = colegios.find(c => c.id === id);
    setFormPagoEstado(colegio?.estadoPago ?? 'AL_DIA');
    setFormPagoFecha(colegio?.proximoVencimiento ?? '');
    setCargandoDetalle(true);
    try {
      const [checklistRes, metricasRes, notasRes] = await Promise.all([
        getChecklistColegio(id), getMetricasColegio(id), getNotasColegio(id),
      ]);
      setChecklist(checklistRes);
      setMetricas(metricasRes);
      setNotas(notasRes);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo cargar el detalle del colegio');
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function agregarNota() {
    if (!detalleId || !nuevaNota.trim()) return;
    setGuardandoNota(true);
    try {
      const nota = await crearNotaColegio(detalleId, nuevaNota.trim());
      setNotas(actuales => [nota, ...actuales]);
      setNuevaNota('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo guardar la nota');
    } finally {
      setGuardandoNota(false);
    }
  }

  async function eliminarNota(nota: NotaInternaApi) {
    if (!detalleId) return;
    if (!(await confirmar({
      titulo: '¿Eliminar esta nota?',
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
    }))) return;
    try {
      await eliminarNotaColegio(detalleId, nota.id);
      setNotas(actuales => actuales.filter(n => n.id !== nota.id));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar la nota');
    }
  }

  async function guardarPago() {
    if (!detalleId) return;
    setGuardandoPago(true);
    try {
      const actualizado = await actualizarPagoColegio(detalleId, formPagoEstado, formPagoFecha || null);
      setColegios(actuales => actuales.map(c => c.id === actualizado.id ? actualizado : c));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo actualizar el estado de pago');
    } finally {
      setGuardandoPago(false);
    }
  }

  function abrirComunicadoGlobal() {
    setComunicadoTitulo('');
    setComunicadoMensaje('');
    setComunicadoAbierto(true);
    setCargandoHistorial(true);
    getComunicadosGlobales()
      .then(setHistorialComunicados)
      .catch(() => setHistorialComunicados([]))
      .finally(() => setCargandoHistorial(false));
  }

  async function enviarComunicado() {
    if (!(await confirmar({
      titulo: '¿Enviar este comunicado a todos los administradores?',
      mensaje: 'Llegará a los administradores de todos los colegios activos de la plataforma.',
      textoConfirmar: 'Enviar a todos',
    }))) return;
    setEnviandoComunicado(true);
    try {
      await enviarComunicadoGlobal(comunicadoTitulo.trim(), comunicadoMensaje.trim());
      setComunicadoTitulo('');
      setComunicadoMensaje('');
      setHistorialComunicados(await getComunicadosGlobales());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo enviar el comunicado');
    } finally {
      setEnviandoComunicado(false);
    }
  }

  /** e.stopPropagation(): por si el item alguna vez es clicable, no afecta hoy. */
  async function eliminarComunicado(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!(await confirmar({
      titulo: 'Borrar este comunicado del historial',
      mensaje: 'Solo se borra del historial del proveedor. No afecta los avisos ya entregados a los administradores.',
      textoConfirmar: 'Borrar',
    }))) return;
    try {
      await eliminarComunicadoGlobal(id);
      setHistorialComunicados(l => l.filter(c => c.id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'No se pudo borrar el comunicado');
    }
  }

  const colegioDetalle = colegios.find(c => c.id === detalleId) ?? null;
  const itemsChecklist = checklist ? [
    { etiqueta: 'Aulas creadas', valor: checklist.aulas, completo: checklist.aulas > 0 },
    { etiqueta: 'Docentes registrados', valor: checklist.docentes, completo: checklist.docentes > 0 },
    { etiqueta: 'Alumnos matriculados', valor: checklist.alumnos, completo: checklist.alumnos > 0 },
    { etiqueta: 'Alumnos con tarjeta RFID', valor: checklist.alumnosConTarjeta, completo: checklist.alumnosConTarjeta > 0 },
    { etiqueta: 'Apoderados con cuenta web', valor: checklist.apoderadosConCuenta, completo: checklist.apoderadosConCuenta > 0 },
    { etiqueta: 'Lectores RFID registrados', valor: checklist.lectoresRegistrados, completo: checklist.lectoresRegistrados > 0 },
    { etiqueta: 'Comunicado publicado', valor: checklist.tieneComunicadoPublicado ? 'Sí' : 'No', completo: checklist.tieneComunicadoPublicado },
  ] : [];

  const activos = colegios.filter(c => c.activo).length;
  const totalAlumnos = colegios.reduce((s, c) => s + c.alumnos, 0);
  const totalUsuarios = colegios.reduce((s, c) => s + c.usuariosActivos, 0);
  const formValido =
    datos.nombre.trim() !== '' && datos.sedeNombre.trim() !== '' &&
    datos.adminNombres.trim() !== '' && datos.adminApellidos.trim() !== '' &&
    /\S+@\S+\.\S+/.test(datos.adminCorreo) && /^\d{8}$/.test(datos.adminDni ?? '') &&
    datos.adminPasswordTemporal.length >= 8;

  return (
    <>
      <Topbar title="Instituciones" subtitle="Panel del proveedor · administración de colegios cliente" />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<Building2 size={19} strokeWidth={1.7} />} label="Colegios"
            value={String(colegios.length)} note={`${activos} activos`} noteTone="ok" />
          <StatCard icon={<GraduationCap size={19} strokeWidth={1.7} />} label="Estudiantes"
            value={String(totalAlumnos)} note="En toda la plataforma" noteTone="neutral" />
          <StatCard icon={<Users size={19} strokeWidth={1.7} />} label="Usuarios activos"
            value={String(totalUsuarios)} note="Cuentas con acceso" noteTone="neutral" />
          <StatCard icon={<Power size={19} strokeWidth={1.7} />} label="Suspendidos"
            value={String(colegios.length - activos)} note="Sin acceso al sistema" noteTone="warn" />
        </div>

        <div className="card px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity size={16} className={saludOk === null ? 'text-ink-3' : saludOk ? 'text-ok' : 'text-bad'} />
            <span className={`text-[13px] font-semibold ${saludOk === null ? 'text-ink-3' : saludOk ? 'text-ok' : 'text-bad'}`}>
              {saludOk === null ? 'Verificando el sistema…' : saludOk ? 'Sistema operativo' : 'Sin respuesta del servidor'}
            </span>
          </div>
          {ultimaVerificacion && (
            <Mono className="!text-[10.5px] !text-ink-3">
              Última verificación: {ultimaVerificacion.toLocaleTimeString('es-PE')}
            </Mono>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={abrirComunicadoGlobal}><Megaphone size={14} /> Comunicado a todos</Button>
          <Button onClick={abrirNuevo}><Plus size={14} /> Registrar colegio</Button>
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : colegios.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Aún no hay colegios registrados</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              Registra el primero al firmar contrato: se crea su sede y la cuenta de su administrador.
            </p>
          </div>
        ) : (
          <div className="grid xl:grid-cols-2 gap-4">
            {colegios.map(c => (
              <div key={c.id} className="card p-6">
                <div className="flex items-start gap-4 mb-4">
                  <LogoColegioGrande
                    colegio={c}
                    onSubido={actualizado => setColegios(actuales => actuales.map(x => x.id === actualizado.id ? actualizado : x))}
                  />
                  <div className="flex-1 min-w-0">
                    <PanelHead
                      title={c.nombre}
                      sub={c.codigoModular ? `Código modular ${c.codigoModular}` : 'Sin código modular'}
                      right={
                        <div className="flex items-center gap-1.5">
                          <Pill tone={PAGO_INFO[c.estadoPago]?.tono ?? 'neutral'}>{PAGO_INFO[c.estadoPago]?.etiqueta ?? c.estadoPago}</Pill>
                          <Pill tone={c.activo ? 'ok' : 'bad'}>{c.activo ? 'Activo' : 'Suspendido'}</Pill>
                        </div>
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><div className="label-mono">Alumnos</div><div className="text-[20px] font-bold">{c.alumnos}</div></div>
                  <div><div className="label-mono">Docentes</div><div className="text-[20px] font-bold">{c.docentes}</div></div>
                  <div><div className="label-mono">Familias</div><div className="text-[20px] font-bold">{c.apoderados}</div></div>
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <Mono className="!text-[10.5px]">
                    Alta: {new Date(c.creadoEn).toLocaleDateString('es-PE')} · {c.usuariosActivos} cuentas activas
                  </Mono>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => void abrirDetalle(c.id)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-brand transition-colors cursor-pointer"
                    >
                      <ClipboardList size={13} /> Ver detalle
                    </button>
                    <button
                      onClick={() => alternarEstado(c)}
                      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                        c.activo ? 'text-ink-3 hover:text-bad' : 'text-ok hover:text-ok'}`}
                    >
                      <Power size={13} /> {c.activo ? 'Suspender' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        abierto={abierto}
        titulo={creado ? 'Colegio registrado' : 'Registrar colegio'}
        subtitulo={creado ? undefined : 'Crea la institución, su sede y la cuenta de administración'}
        onCerrar={() => setAbierto(false)}
        pie={creado ? (
          <Button onClick={() => setAbierto(false)}>Entendido</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Registrar
            </Button>
          </>
        )}
      >
        {creado ? (
          <div>
            <div className="flex items-center gap-2 text-ok mb-4">
              <CheckCircle2 size={18} />
              <p className="text-[14px] font-semibold">{creado.colegio.nombre}</p>
            </div>
            <div className="rounded-[12px] border border-line p-4 space-y-3">
              <div>
                <div className="label-mono">Usuario del administrador</div>
                <Mono className="!text-[13px] font-semibold !text-ink">{creado.correo}</Mono>
              </div>
              <div className="pt-3 border-t border-line">
                <div className="label-mono">Contraseña temporal</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Mono className="!text-[17px] font-bold !text-brand tracking-widest">{creado.clave}</Mono>
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${creado.correo} / ${creado.clave}`)}
                    className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                    title="Copiar credenciales"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[12px] text-ink-3 mt-4">
              Entrega estas credenciales al director. Debe cambiar la contraseña en su primer ingreso.
              Esta es la única vez que se muestra.
            </p>
          </div>
        ) : (
          <>
            {errorForm && (
              <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
            )}

            <p className="label-mono mb-3">Institución</p>
            <Campo etiqueta="Nombre del colegio" requerido>
              <input className={claseInput} autoFocus value={datos.nombre}
                onChange={e => setDatos({ ...datos, nombre: e.target.value })} placeholder="I.E.P. Santa Rosa" />
            </Campo>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Campo etiqueta="Código modular">
                <input className={`${claseInput} font-mono`} value={datos.codigoModular ?? ''}
                  onChange={e => setDatos({ ...datos, codigoModular: e.target.value })} />
              </Campo>
              <Campo etiqueta="RUC">
                <input className={`${claseInput} font-mono`} value={datos.ruc ?? ''}
                  onChange={e => setDatos({ ...datos, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })} />
              </Campo>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Campo etiqueta="Sede principal" requerido>
                <input className={claseInput} value={datos.sedeNombre}
                  onChange={e => setDatos({ ...datos, sedeNombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Dirección">
                <input className={claseInput} value={datos.sedeDireccion ?? ''}
                  onChange={e => setDatos({ ...datos, sedeDireccion: e.target.value })} />
              </Campo>
            </div>

            <div className="border-t border-line pt-4 mt-1">
              <p className="label-mono mb-3">Cuenta de administración</p>
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Campo etiqueta="Nombres" requerido>
                  <input className={claseInput} value={datos.adminNombres}
                    onChange={e => setDatos({ ...datos, adminNombres: e.target.value })} />
                </Campo>
                <Campo etiqueta="Apellidos" requerido>
                  <input className={claseInput} value={datos.adminApellidos}
                    onChange={e => setDatos({ ...datos, adminApellidos: e.target.value })} />
                </Campo>
              </div>
              <Campo etiqueta="Correo" requerido>
                <input type="email" className={claseInput} maxLength={160} value={datos.adminCorreo}
                  onChange={e => setDatos({ ...datos, adminCorreo: e.target.value })}
                  placeholder="direccion@santarosa.edu.pe" />
              </Campo>
              <Campo etiqueta="DNI del administrador" requerido>
                <input className={`${claseInput} font-mono`} value={datos.adminDni ?? ''}
                  onChange={e => setDatos({ ...datos, adminDni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                  inputMode="numeric" placeholder="8 dígitos" />
              </Campo>
              <Campo etiqueta="Contraseña temporal" requerido>
                <div className="flex gap-2">
                  <input className={`${claseInput} font-mono`} value={datos.adminPasswordTemporal}
                    onChange={e => setDatos({ ...datos, adminPasswordTemporal: e.target.value })} />
                  <Button variant="ghost" onClick={() => setDatos({ ...datos, adminPasswordTemporal: claveTemporal() })}>
                    Generar
                  </Button>
                </div>
              </Campo>
            </div>
          </>
        )}
      </Modal>

      <Modal
        abierto={detalleId !== null}
        titulo={colegioDetalle?.nombre ?? 'Detalle del colegio'}
        subtitulo="Avance de implementación"
        onCerrar={() => setDetalleId(null)}
        pie={<Button variant="ghost" onClick={() => setDetalleId(null)}>Cerrar</Button>}
      >
        {cargandoDetalle ? (
          <div className="py-8 grid place-items-center text-ink-3"><Loader2 size={20} className="animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="label-mono mb-2">Avance de implementación</p>
              <div className="space-y-2">
                {itemsChecklist.map(item => (
                  <div key={item.etiqueta} className="flex items-center justify-between rounded-[10px] border border-line px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                      {item.completo
                        ? <CheckCircle2 size={15} className="text-ok shrink-0" />
                        : <Circle size={15} className="text-ink-3 shrink-0" />}
                      {item.etiqueta}
                    </span>
                    <Mono className="!text-[12.5px] font-semibold !text-ink">{item.valor}</Mono>
                  </div>
                ))}
              </div>
            </div>

            {metricas && (
              <div>
                <p className="label-mono mb-2">Actividad reciente</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[10px] border border-line px-3.5 py-2.5">
                    <div className="text-[10.5px] text-ink-3 font-medium">Lecturas esta semana</div>
                    <div className="text-[18px] font-bold mt-0.5">{metricas.lecturasSemana}</div>
                  </div>
                  <div className="rounded-[10px] border border-line px-3.5 py-2.5">
                    <div className="text-[10.5px] text-ink-3 font-medium">Comunicados publicados</div>
                    <div className="text-[18px] font-bold mt-0.5">{metricas.comunicadosPublicadosTotal}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 rounded-[10px] border border-line px-3.5 py-2.5">
                  <History size={14} className="text-ink-3 shrink-0" />
                  <span className="text-[12.5px] text-ink-2">
                    {metricas.ultimaActividad
                      ? <>Última actividad: <span className="font-semibold text-ink">{new Date(metricas.ultimaActividad).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</span></>
                      : <span className="text-ink-3">Sin actividad registrada</span>}
                  </span>
                </div>
              </div>
            )}

            <div>
              <p className="label-mono mb-2">Estado de pago</p>
              <div className="flex gap-2">
                <select className={claseInput} value={formPagoEstado} onChange={e => setFormPagoEstado(e.target.value)}>
                  <option value="AL_DIA">Al día</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="VENCIDO">Vencido</option>
                </select>
                <input
                  type="date"
                  className={claseInput}
                  value={formPagoFecha}
                  onChange={e => setFormPagoFecha(e.target.value)}
                  title="Próximo vencimiento"
                />
                <Button onClick={() => void guardarPago()} disabled={guardandoPago}>
                  {guardandoPago ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>

            <div>
              <p className="label-mono mb-2">Notas internas</p>
              <div className="flex gap-2 mb-3">
                <input
                  className={claseInput}
                  placeholder="Ej: renovó contrato hasta dic. 2026, pendiente factura…"
                  value={nuevaNota}
                  onChange={e => setNuevaNota(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void agregarNota(); }}
                />
                <Button onClick={() => void agregarNota()} disabled={!nuevaNota.trim() || guardandoNota}>
                  {guardandoNota ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                </Button>
              </div>

              {notas.length === 0 ? (
                <div className="flex items-center gap-2 text-[12px] text-ink-3 px-1">
                  <StickyNote size={13} /> Sin notas todavía.
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto scroll-thin">
                  {notas.map(n => (
                    <div key={n.id} className="rounded-[10px] border border-line px-3.5 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12.5px] text-ink leading-snug flex-1">{n.contenido}</p>
                        <button
                          onClick={() => void eliminarNota(n)}
                          className="shrink-0 text-ink-3 hover:text-bad transition-colors cursor-pointer"
                          title="Eliminar nota"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="text-[10.5px] text-ink-3 mt-1.5">
                        {n.autorNombre} · {new Date(n.creadoEn).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        abierto={comunicadoAbierto}
        titulo="Comunicado a todos los administradores"
        subtitulo="Llega a los administradores de todos los colegios activos"
        onCerrar={() => setComunicadoAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setComunicadoAbierto(false)}>Cancelar</Button>
            <Button
              onClick={() => void enviarComunicado()}
              disabled={!comunicadoTitulo.trim() || !comunicadoMensaje.trim() || enviandoComunicado}
            >
              {enviandoComunicado ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
              Enviar a todos
            </Button>
          </>
        }
      >
        <Campo etiqueta="Título" requerido>
          <input className={claseInput} autoFocus value={comunicadoTitulo}
            onChange={e => setComunicadoTitulo(e.target.value)} placeholder="Mantenimiento programado" />
        </Campo>
        <Campo etiqueta="Mensaje" requerido>
          <textarea className={`${claseInput} min-h-[100px]`} value={comunicadoMensaje}
            onChange={e => setComunicadoMensaje(e.target.value)}
            placeholder="El sistema estará en mantenimiento el domingo de 2 a 4 a. m." />
        </Campo>

        <div className="border-t border-line pt-4 mt-1">
          <p className="label-mono mb-2">Historial enviado</p>
          {cargandoHistorial ? (
            <div className="py-4 grid place-items-center text-ink-3"><Loader2 size={16} className="animate-spin" /></div>
          ) : historialComunicados.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-ink-3 px-1">
              <Megaphone size={13} /> Todavía no enviaste ningún comunicado global.
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto scroll-thin">
              {historialComunicados.map(c => (
                <div key={c.id} className="rounded-[10px] border border-line px-3.5 py-2.5 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-ink">{c.titulo}</p>
                    <p className="text-[12px] text-ink-2 leading-snug mt-0.5">{c.mensaje}</p>
                    <p className="text-[10.5px] text-ink-3 mt-1.5">
                      {c.autorNombre} · {new Date(c.creadoEn).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' '}· {c.destinatarios} {c.destinatarios === 1 ? 'administrador' : 'administradores'}
                    </p>
                  </div>
                  <button onClick={e => void eliminarComunicado(e, c.id)} title="Borrar del historial"
                    className="shrink-0 self-start grid place-items-center w-6 h-6 rounded-full text-ink-3 hover:bg-bad-soft hover:text-bad transition-colors cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
