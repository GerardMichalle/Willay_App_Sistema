import { useCallback, useEffect, useState } from 'react';
import { Loader2, KeyRound, Mail, Phone, Users, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill, Button } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import CodigoActivacionModal from '../../components/CodigoActivacionModal';
import { getApoderados, reenviarCodigoUsuario, crearCuentaApoderado, eliminarApoderado } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import type { ApoderadoApi } from '../../types';

export default function Apoderados() {
  const confirmar = useConfirm();
  const toast = useToast();
  const [apoderados, setApoderados] = useState<ApoderadoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigoMostrado, setCodigoMostrado] = useState<{ nombre: string; codigo: string } | null>(null);

  const [creandoPara, setCreandoPara] = useState<ApoderadoApi | null>(null);
  const [correoCuenta, setCorreoCuenta] = useState('');
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);

  const cargar = useCallback(() => {
    getApoderados()
      .then(setApoderados)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo cargar la lista'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function reenviar(a: ApoderadoApi) {
    if (a.usuarioId == null) return;
    try {
      const actualizado = await reenviarCodigoUsuario(a.usuarioId);
      cargar();
      setCodigoMostrado({ nombre: `${a.nombres} ${a.apellidos}`, codigo: actualizado.codigoActivacion ?? '' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo reemitir el código');
    }
  }

  function abrirCrearCuenta(a: ApoderadoApi) {
    setCreandoPara(a);
    setCorreoCuenta('');
    setErrorCuenta(null);
  }

  async function confirmarCrearCuenta() {
    if (!creandoPara) return;
    setErrorCuenta(null);
    setGuardandoCuenta(true);
    try {
      const r = await crearCuentaApoderado(creandoPara.id, correoCuenta.trim());
      const nombre = `${creandoPara.nombres} ${creandoPara.apellidos}`;
      setCreandoPara(null);
      setCodigoMostrado({ nombre, codigo: r.codigoActivacion });
      await cargar();
    } catch (e) {
      setErrorCuenta(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setGuardandoCuenta(false);
    }
  }

  async function eliminar(a: ApoderadoApi) {
    if (!(await confirmar({
      titulo: `¿Eliminar a ${a.nombres} ${a.apellidos}?`,
      mensaje: 'Sus hijos vinculados no se ven afectados, solo quedan sin este apoderado.',
      textoConfirmar: 'Eliminar',
    }))) return;
    try {
      await eliminarApoderado(a.id);
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  const conCuenta = apoderados.filter(a => a.estadoCuenta === 'ACTIVO').length;

  return (
    <>
      <Topbar
        title="Apoderados"
        subtitle={cargando ? 'Cargando…' : `${apoderados.length} familias · ${conCuenta} con cuenta web activa`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : apoderados.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Aún no hay apoderados registrados</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              Los apoderados se crean automáticamente al matricular a un estudiante.
            </p>
          </div>
        ) : (
          <Table head={['Apoderado', 'DNI', 'Contacto', 'Hijos vinculados', 'Cuenta web', '']}>
            {apoderados.map(a => (
              <Tr key={a.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} />
                    <p className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</p>
                  </div>
                </Td>
                <Td><Mono>{a.dni}</Mono></Td>
                <Td>
                  <div className="leading-tight">
                    {a.telefono && <p className="flex items-center gap-1.5 text-[12px] text-ink-2"><Phone size={11} /> {a.telefono}</p>}
                    {a.correo && <p className="flex items-center gap-1.5 text-[12px] text-ink-3 mt-0.5"><Mail size={11} /> {a.correo}</p>}
                    {!a.telefono && !a.correo && <Mono className="!text-ink-3">— sin contacto —</Mono>}
                  </div>
                </Td>
                <Td>
                  {a.hijos.length === 0 ? (
                    <Mono className="!text-ink-3">— ninguno —</Mono>
                  ) : (
                    <div className="space-y-1">
                      {a.hijos.map(h => (
                        <p key={h.id} className="flex items-center gap-1.5 text-[12.5px]">
                          <Users size={11} className="text-ink-3" />
                          <span className="font-medium">{h.nombre}</span>
                          <Mono className="!text-[10.5px]">{h.aula} · {h.parentesco.toLowerCase()}</Mono>
                        </p>
                      ))}
                    </div>
                  )}
                </Td>
                <Td>
                  {a.estadoCuenta === 'ACTIVO' ? (
                    <Pill tone="ok">Activa</Pill>
                  ) : a.estadoCuenta === 'SIN_CUENTA' ? (
                    <Pill tone="neutral">Sin correo</Pill>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Pill tone="warn">Pendiente</Pill>
                      {a.codigoActivacion && (
                        <span className="inline-flex items-center gap-1 rounded-[8px] border border-line bg-canvas px-2 py-1">
                          <KeyRound size={11} className="text-ink-3" />
                          <Mono className="!text-[11px] font-semibold !text-ink">{a.codigoActivacion}</Mono>
                        </span>
                      )}
                      <button onClick={() => reenviar(a)} title="Reemitir código"
                        className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <RefreshCw size={12} />
                      </button>
                    </div>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1 justify-end">
                    {a.estadoCuenta === 'SIN_CUENTA' && (
                      <button onClick={() => abrirCrearCuenta(a)} title="Crear cuenta web"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <UserPlus size={14} />
                      </button>
                    )}
                    {a.estadoCuenta !== 'ACTIVO' && (
                      <button onClick={() => eliminar(a)} title="Eliminar"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal
        abierto={creandoPara !== null}
        titulo="Crear cuenta web"
        subtitulo={creandoPara ? `Para ${creandoPara.nombres} ${creandoPara.apellidos}` : undefined}
        onCerrar={() => setCreandoPara(null)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setCreandoPara(null)}>Cancelar</Button>
            <Button onClick={confirmarCrearCuenta} disabled={!correoCuenta.trim() || guardandoCuenta}>
              {guardandoCuenta ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Crear cuenta
            </Button>
          </>
        }
      >
        {errorCuenta && (
          <p className="mb-3 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorCuenta}</p>
        )}
        <Campo etiqueta="Correo del apoderado" requerido>
          <input type="email" className={claseInput} maxLength={160} value={correoCuenta} autoFocus
            onChange={e => setCorreoCuenta(e.target.value)} placeholder="madre@gmail.com" />
        </Campo>
        <p className="text-[11px] text-ink-3 mt-1.5">
          Se emitirá un código de activación de un solo uso para que cree su contraseña.
        </p>
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
