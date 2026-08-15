import { useEffect, useState } from 'react';
import { Loader2, KeyRound, Mail, Phone, Users } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Table, Tr, Td, Avatar, Mono, Pill } from '../../components/ui';
import { getApoderados } from '../../services/api';
import type { ApoderadoApi } from '../../types';

export default function Apoderados() {
  const [apoderados, setApoderados] = useState<ApoderadoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApoderados()
      .then(setApoderados)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo cargar la lista'))
      .finally(() => setCargando(false));
  }, []);

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
          <Table head={['Apoderado', 'DNI', 'Contacto', 'Hijos vinculados', 'Cuenta web']}>
            {apoderados.map(a => (
              <Tr key={a.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} />
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
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
