import { useCallback, useEffect, useState } from 'react';
import { Loader2, KeyRound, Power, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill, FilterTabs } from '../../components/ui';
import { getUsuariosAdmin, cambiarEstadoUsuario, reenviarCodigoUsuario } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import CodigoActivacionModal from '../../components/CodigoActivacionModal';
import type { UsuarioAdminApi } from '../../types';

const ROL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Proveedor', ADMIN: 'Administrador', DIRECCION: 'Dirección',
  DOCENTE: 'Docente', ALUMNO: 'Estudiante', APODERADO: 'Apoderado',
};

export default function Usuarios() {
  const confirmar = useConfirm();
  const toast = useToast();
  const [lista, setLista] = useState<UsuarioAdminApi[]>([]);
  const [tab, setTab] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigoMostrado, setCodigoMostrado] = useState<{ nombre: string; codigo: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLista(await getUsuariosAdmin());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cuentas');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  async function alternarEstado(u: UsuarioAdminApi) {
    const activar = u.estado !== 'ACTIVO';
    if (!(await confirmar({
      titulo: `¿${activar ? 'Reactivar' : 'Suspender'} la cuenta de ${u.nombres} ${u.apellidos}?`,
      mensaje: activar ? 'Recuperará el acceso al sistema.' : 'No podrá iniciar sesión hasta que la reactives.',
      textoConfirmar: activar ? 'Reactivar' : 'Suspender',
    }))) return;
    try {
      await cambiarEstadoUsuario(u.id, activar);
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    }
  }

  async function reenviar(u: UsuarioAdminApi) {
    try {
      const actualizado = await reenviarCodigoUsuario(u.id);
      await cargar();
      setCodigoMostrado({ nombre: `${u.nombres} ${u.apellidos}`, codigo: actualizado.codigoActivacion ?? '' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo reemitir el código');
    }
  }

  const filtrados = lista.filter(u => {
    if (tab === 'Activos' && u.estado !== 'ACTIVO') return false;
    if (tab === 'Pendientes' && u.estado !== 'PENDIENTE') return false;
    if (tab === 'Suspendidos' && u.estado !== 'SUSPENDIDO') return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return `${u.nombres} ${u.apellidos} ${u.correo}`.toLowerCase().includes(q);
    }
    return true;
  });

  const activos = lista.filter(u => u.estado === 'ACTIVO').length;
  const pendientes = lista.filter(u => u.estado === 'PENDIENTE').length;

  return (
    <>
      <Topbar
        title="Usuarios"
        subtitle={cargando ? 'Cargando…' : `${lista.length} cuentas · ${activos} activas · ${pendientes} sin activar`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={['Todos', 'Activos', 'Pendientes', 'Suspendidos']} active={tab} onChange={setTab} />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="w-[240px] rounded-[10px] border border-line bg-paper pl-9 pr-3 py-2 text-[12.5px] outline-none transition-all focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
            />
          </div>
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Ninguna cuenta coincide con el filtro</p>
          </div>
        ) : (
          <Table head={['Usuario', 'Rol', 'Contacto', 'Último acceso', 'Estado', '']}>
            {filtrados.map(u => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${u.nombres} ${u.apellidos}`} fotoUrl={u.fotoUrl} size="sm" />
                    <div className="leading-tight">
                      <p className="font-semibold text-[13px]">{u.nombres} {u.apellidos}</p>
                      <Mono className="!text-[10.5px]">{u.correo}</Mono>
                    </div>
                  </div>
                </Td>
                <Td><Pill tone={u.rol === 'ADMIN' ? 'brand' : 'neutral'}>{ROL_LABEL[u.rol] ?? u.rol}</Pill></Td>
                <Td>
                  <div className="leading-tight">
                    {u.dni && <Mono className="!text-[11px] block">DNI {u.dni}</Mono>}
                    {u.telefono && <Mono className="!text-[11px] block !text-ink-3">{u.telefono}</Mono>}
                  </div>
                </Td>
                <Td><Mono className="!text-[11px]">{u.ultimoAcceso ?? 'nunca'}</Mono></Td>
                <Td>
                  {u.estado === 'ACTIVO' ? <Pill tone="ok">Activa</Pill>
                    : u.estado === 'SUSPENDIDO' ? <Pill tone="bad">Suspendida</Pill>
                    : (
                      <div className="flex items-center gap-2">
                        <Pill tone="warn">Pendiente</Pill>
                        {u.codigoActivacion && (
                          <span className="inline-flex items-center gap-1 rounded-[8px] border border-line bg-canvas px-2 py-1">
                            <KeyRound size={11} className="text-ink-3" />
                            <Mono className="!text-[11px] font-semibold !text-ink">{u.codigoActivacion}</Mono>
                          </span>
                        )}
                      </div>
                    )}
                </Td>
                <Td>
                  <div className="flex gap-1 justify-end">
                    {u.estado === 'PENDIENTE' && (
                      <button onClick={() => reenviar(u)} title="Reemitir código"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <RefreshCw size={13} />
                      </button>
                    )}
                    <button onClick={() => alternarEstado(u)}
                      title={u.estado === 'ACTIVO' ? 'Suspender' : 'Reactivar'}
                      className={`grid place-items-center w-8 h-8 rounded-[9px] transition-colors cursor-pointer ${
                        u.estado === 'ACTIVO' ? 'text-ink-3 hover:text-bad hover:bg-bad-soft' : 'text-ok hover:bg-ok-soft'}`}>
                      <Power size={13} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}

        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <ShieldCheck size={12} /> Las contraseñas nunca son visibles ni recuperables: cada usuario crea la suya al activar su cuenta.
        </p>
      </div>

      <CodigoActivacionModal
        abierto={!!codigoMostrado}
        nombre={codigoMostrado?.nombre ?? ''}
        codigo={codigoMostrado?.codigo ?? ''}
        onCerrar={() => setCodigoMostrado(null)}
      />
    </>
  );
}
