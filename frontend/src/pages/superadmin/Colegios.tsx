import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Building2, Power, Users, GraduationCap, CheckCircle2, Copy } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, Mono, Pill, Button, PanelHead } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import { getColegios, crearColegio, cambiarEstadoColegio, type DatosColegio } from '../../services/api';
import type { ColegioApi } from '../../types';

const VACIO: DatosColegio = {
  nombre: '', codigoModular: '', ruc: '', colorMarca: '#E02D2D',
  sedeNombre: 'Sede Central', sedeDireccion: '',
  adminNombres: '', adminApellidos: '', adminCorreo: '',
  adminDni: '', adminTelefono: '', adminPasswordTemporal: '',
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
  const [colegios, setColegios] = useState<ColegioApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<DatosColegio>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ colegio: ColegioApi; correo: string; clave: string } | null>(null);

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
    if (!confirm(`¿Seguro que deseas ${accion} ${c.nombre}?\n\n${c.activo
      ? 'Sus usuarios no podrán iniciar sesión. Todos los datos se conservan.'
      : 'Sus usuarios recuperarán el acceso.'}`)) return;
    try {
      await cambiarEstadoColegio(c.id, !c.activo);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  }

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

        <div className="flex justify-end">
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
                <PanelHead
                  title={c.nombre}
                  sub={c.codigoModular ? `Código modular ${c.codigoModular}` : 'Sin código modular'}
                  right={<Pill tone={c.activo ? 'ok' : 'bad'}>{c.activo ? 'Activo' : 'Suspendido'}</Pill>}
                />
                <div className="grid grid-cols-3 gap-4">
                  <div><div className="label-mono">Alumnos</div><div className="text-[20px] font-bold">{c.alumnos}</div></div>
                  <div><div className="label-mono">Docentes</div><div className="text-[20px] font-bold">{c.docentes}</div></div>
                  <div><div className="label-mono">Familias</div><div className="text-[20px] font-bold">{c.apoderados}</div></div>
                </div>
                <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
                  <Mono className="!text-[10.5px]">
                    Alta: {new Date(c.creadoEn).toLocaleDateString('es-PE')} · {c.usuariosActivos} cuentas activas
                  </Mono>
                  <button
                    onClick={() => alternarEstado(c)}
                    className={`inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
                      c.activo ? 'text-ink-3 hover:text-bad' : 'text-ok hover:text-ok'}`}
                  >
                    <Power size={13} /> {c.activo ? 'Suspender' : 'Reactivar'}
                  </button>
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
    </>
  );
}
