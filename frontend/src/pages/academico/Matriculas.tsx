import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus, Upload, Download, Loader2, CheckCircle2, AlertTriangle,
  FileSpreadsheet, KeyRound, Printer, X,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { StatCard, Table, Tr, Td, Avatar, Mono, Pill, Button, PanelHead } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import TelefonoInput from '../../components/TelefonoInput';
import {
  getAlumnos, getAulas, matricular, descargarPlantilla,
  previsualizarImportacion, confirmarImportacion, type DatosMatricula,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { Alumno, Aula, Importacion, MatriculaResultado } from '../../types';

const VACIO: DatosMatricula = {
  alumno: { nombres: '', apellidos: '', dni: '', fechaNacimiento: '', aulaId: 0, tarjetaRfid: '', crearCuenta: false, correo: '' },
  apoderado: { nombres: '', apellidos: '', dni: '', telefono: '', correo: '', parentesco: 'APODERADO' },
};

export default function Matriculas() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'admin';
  const archivoRef = useRef<HTMLInputElement>(null);

  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [cargando, setCargando] = useState(true);

  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<DatosMatricula>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [resultado, setResultado] = useState<MatriculaResultado | null>(null);

  // Importación masiva
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<Importacion | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorImport, setErrorImport] = useState<string | null>(null);
  const [importados, setImportados] = useState<MatriculaResultado[] | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [al, au] = await Promise.all([getAlumnos(), getAulas()]);
      setAlumnos(al);
      setAulas(au);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  function abrirNueva() {
    setDatos({ ...VACIO, alumno: { ...VACIO.alumno, aulaId: aulas[0]?.id ?? 0 } });
    setErrorForm(null);
    setResultado(null);
    setAbierto(true);
  }

  async function guardar() {
    setErrorForm(null);
    setGuardando(true);
    try {
      const r = await matricular({
        alumno: {
          ...datos.alumno,
          dni: datos.alumno.dni?.trim() || null,
          fechaNacimiento: datos.alumno.fechaNacimiento || null,
          tarjetaRfid: datos.alumno.tarjetaRfid?.trim() || null,
          correo: datos.alumno.correo?.trim() || null,
        },
        apoderado: {
          ...datos.apoderado,
          telefono: datos.apoderado.telefono?.trim() || null,
          correo: datos.apoderado.correo?.trim() || null,
        },
      });
      setResultado(r);   // muestra los códigos de activación generados
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo registrar la matrícula');
    } finally {
      setGuardando(false);
    }
  }

  async function elegirArchivo(f: File | null) {
    setArchivo(f);
    setVista(null);
    setImportados(null);
    setErrorImport(null);
    if (!f) return;
    setImportando(true);
    try {
      setVista(await previsualizarImportacion(f));   // nada se guarda todavía
    } catch (e) {
      setErrorImport(e instanceof Error ? e.message : 'No se pudo leer el archivo');
    } finally {
      setImportando(false);
    }
  }

  async function confirmar() {
    if (!archivo) return;
    setImportando(true);
    setErrorImport(null);
    try {
      setImportados(await confirmarImportacion(archivo));
      await cargar();
    } catch (e) {
      setErrorImport(e instanceof Error ? e.message : 'No se pudo completar la importación');
    } finally {
      setImportando(false);
    }
  }

  const matriculados = alumnos.filter(a => a.estado !== 'RETIRADO');
  const sinTarjeta = matriculados.filter(a => !a.tarjetaRfid).length;
  const capacidad = aulas.length * 30;
  const formValido =
    datos.alumno.nombres.trim() !== '' && datos.alumno.apellidos.trim() !== '' && datos.alumno.aulaId > 0 &&
    datos.apoderado.nombres.trim() !== '' && datos.apoderado.apellidos.trim() !== '' &&
    /^\d{8}$/.test(datos.apoderado.dni);

  return (
    <>
      <Topbar title="Matrículas" subtitle={`Periodo ${new Date().getFullYear()} · alta de estudiantes y familias`} />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<FileSpreadsheet size={19} strokeWidth={1.7} />} label="Matriculados"
            value={String(matriculados.length)} denom={capacidad ? String(capacidad) : ''}
            note={aulas.length ? `${aulas.length} aulas activas` : 'Sin aulas creadas'} noteTone="ok" />
          <StatCard icon={<KeyRound size={19} strokeWidth={1.7} />} label="Sin tarjeta RFID"
            value={String(sinTarjeta)} note={sinTarjeta ? 'Pendientes de entrega' : 'Todos con tarjeta'} noteTone="warn" />
          <StatCard icon={<CheckCircle2 size={19} strokeWidth={1.7} />} label="Aulas disponibles"
            value={String(aulas.length)} note="Para asignar estudiantes" noteTone="neutral" />
          <StatCard icon={<Upload size={19} strokeWidth={1.7} />} label="Importación masiva"
            value={vista ? String(vista.validas) : '—'} note="Filas válidas en el archivo" noteTone="neutral" />
        </div>

        {esAdmin && (
          <div className="card p-5 flex flex-wrap items-center gap-3">
            <span className="label-mono mr-1">Registrar estudiantes</span>
            <Button onClick={abrirNueva} disabled={aulas.length === 0}
              title={aulas.length === 0 ? 'Primero crea aulas' : undefined}>
              <Plus size={14} /> Matrícula individual
            </Button>
            <Button variant="ghost" onClick={() => archivoRef.current?.click()} disabled={aulas.length === 0}>
              <Upload size={14} /> Importar desde Excel
            </Button>
            <Button variant="ghost" onClick={() => void descargarPlantilla()}>
              <Download size={14} /> Descargar plantilla
            </Button>
            <input
              ref={archivoRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={e => void elegirArchivo(e.target.files?.[0] ?? null)}
            />
            {aulas.length === 0 && (
              <p className="text-[12px] text-ink-3 w-full">
                Crea al menos un aula antes de matricular estudiantes.
              </p>
            )}
          </div>
        )}

        {/* ── Vista previa de importación ── */}
        {(archivo || errorImport) && (
          <div className="card p-6">
            <PanelHead
              title="Importación desde Excel"
              sub={archivo?.name}
              right={
                <button onClick={() => void elegirArchivo(null)}
                  className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                  <X size={15} />
                </button>
              }
            />

            {errorImport && (
              <p className="rounded-[10px] bg-bad-soft text-bad text-[12.5px] font-medium px-3.5 py-2.5">{errorImport}</p>
            )}

            {importando && !vista && (
              <div className="py-8 grid place-items-center text-ink-3"><Loader2 size={20} className="animate-spin" /></div>
            )}

            {importados ? (
              <div>
                <div className="flex items-center gap-2 text-ok mb-4">
                  <CheckCircle2 size={17} />
                  <p className="text-[13.5px] font-semibold">{importados.length} estudiantes matriculados correctamente</p>
                </div>
                <p className="text-[12.5px] text-ink-2 mb-3">
                  Entrega estos códigos de activación a cada familia. Solo se muestran ahora: guárdalos o imprímelos.
                </p>
                <div className="max-h-[280px] overflow-y-auto scroll-thin border border-line rounded-[10px]">
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead className="sticky top-0 bg-canvas">
                      <tr>
                        <th className="label-mono text-left px-3 py-2">Estudiante</th>
                        <th className="label-mono text-left px-3 py-2">Código</th>
                        <th className="label-mono text-left px-3 py-2">Apoderado</th>
                        <th className="label-mono text-left px-3 py-2">Activación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importados.map(r => (
                        <tr key={r.alumnoId} className="border-t border-line">
                          <td className="px-3 py-2 font-medium">{r.nombreAlumno}</td>
                          <td className="px-3 py-2"><Mono>{r.codigoAlumno}</Mono></td>
                          <td className="px-3 py-2 text-ink-2">{r.nombreApoderado}</td>
                          <td className="px-3 py-2">
                            {r.codigoActivacionApoderado
                              ? <Mono className="font-semibold !text-ink">{r.codigoActivacionApoderado}</Mono>
                              : <Mono className="!text-ink-3">— sin correo —</Mono>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" onClick={() => window.print()}><Printer size={14} /> Imprimir</Button>
                </div>
              </div>
            ) : vista && (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Pill tone="neutral">{vista.totalFilas} filas leídas</Pill>
                  <Pill tone="ok">{vista.validas} listas para importar</Pill>
                  {vista.conError > 0 && <Pill tone="bad">{vista.conError} con errores</Pill>}
                </div>

                <div className="max-h-[320px] overflow-y-auto scroll-thin border border-line rounded-[10px]">
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead className="sticky top-0 bg-canvas">
                      <tr>
                        <th className="label-mono text-left px-3 py-2">Fila</th>
                        <th className="label-mono text-left px-3 py-2">Estudiante</th>
                        <th className="label-mono text-left px-3 py-2">Aula</th>
                        <th className="label-mono text-left px-3 py-2">Apoderado</th>
                        <th className="label-mono text-left px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vista.filas.map(f => (
                        <tr key={f.numeroFila} className={`border-t border-line ${f.valida ? '' : 'bg-bad-soft/30'}`}>
                          <td className="px-3 py-2"><Mono>{f.numeroFila}</Mono></td>
                          <td className="px-3 py-2 font-medium">{f.nombresAlumno} {f.apellidosAlumno}</td>
                          <td className="px-3 py-2"><Mono className="!text-[11px]">{f.aula.replace(/\|/g, ' ')}</Mono></td>
                          <td className="px-3 py-2 text-ink-2">
                            {f.nombresApoderado} {f.apellidosApoderado}
                            {f.nombresApoderado && <span className="text-ink-3"> · {f.parentesco}</span>}
                          </td>
                          <td className="px-3 py-2">
                            {f.valida ? (
                              <span className="inline-flex items-center gap-1.5 text-ok text-[11.5px] font-semibold">
                                <CheckCircle2 size={12} /> Lista
                              </span>
                            ) : (
                              <span className="inline-flex items-start gap-1.5 text-bad text-[11.5px]">
                                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                <span>{f.errores.join('. ')}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[12px] text-ink-3">
                    Nada se ha guardado todavía. Las filas con errores se omitirán.
                  </p>
                  <Button onClick={confirmar} disabled={vista.validas === 0 || importando}>
                    {importando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Importar {vista.validas} estudiantes
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Listado ── */}
        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : matriculados.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[14px] font-semibold">Aún no hay estudiantes matriculados</p>
            <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[400px] mx-auto">
              Usa la matrícula individual para casos puntuales o importa el padrón completo desde Excel.
            </p>
          </div>
        ) : (
          <Table head={['Estudiante', 'Código', 'Aula', 'Apoderado', 'Tarjeta']}>
            {matriculados.map(a => (
              <Tr key={a.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={`${a.nombres} ${a.apellidos}`} fotoUrl={a.fotoUrl} size="sm" />
                    <span className="font-semibold text-[13px]">{a.nombres} {a.apellidos}</span>
                  </div>
                </Td>
                <Td><Mono>{a.codigo}</Mono></Td>
                <Td><Mono>{a.grado} "{a.seccion}"</Mono></Td>
                <Td className="text-[12.5px] text-ink-2">{a.apoderado}</Td>
                <Td>
                  {a.tarjetaRfid
                    ? <Mono className="!text-[11px]">{a.tarjetaRfid}</Mono>
                    : <Pill tone="warn">Pendiente</Pill>}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      {/* ── Matrícula individual ── */}
      <Modal
        abierto={abierto}
        titulo={resultado ? 'Matrícula registrada' : 'Nueva matrícula'}
        subtitulo={resultado ? undefined : 'Se registra al estudiante y a su apoderado en un solo acto'}
        onCerrar={() => setAbierto(false)}
        pie={resultado ? (
          <Button onClick={() => setAbierto(false)}>Entendido</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : null} Matricular
            </Button>
          </>
        )}
      >
        {resultado ? (
          <div>
            <div className="flex items-center gap-2 text-ok mb-4">
              <CheckCircle2 size={18} />
              <p className="text-[14px] font-semibold">{resultado.nombreAlumno} · {resultado.aula}</p>
            </div>
            <div className="rounded-[12px] border border-line p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[12.5px] text-ink-2">Código del estudiante</span>
                <Mono className="font-semibold !text-ink !text-[13px]">{resultado.codigoAlumno}</Mono>
              </div>
              {resultado.codigoActivacionApoderado && (
                <div className="flex justify-between items-center pt-3 border-t border-line">
                  <span className="text-[12.5px] text-ink-2">Código de activación · {resultado.nombreApoderado}</span>
                  <Mono className="font-bold !text-brand !text-[16px] tracking-widest">{resultado.codigoActivacionApoderado}</Mono>
                </div>
              )}
              {resultado.codigoActivacionAlumno && (
                <div className="flex justify-between items-center pt-3 border-t border-line">
                  <span className="text-[12.5px] text-ink-2">Código de activación · estudiante</span>
                  <Mono className="font-bold !text-brand !text-[16px] tracking-widest">{resultado.codigoActivacionAlumno}</Mono>
                </div>
              )}
            </div>
            <p className="text-[12px] text-ink-3 mt-4">
              Entrega el código de activación a la familia por WhatsApp o impreso. Con él y su DNI podrán crear su contraseña.
            </p>
          </div>
        ) : (
          <>
            {errorForm && (
              <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
            )}

            <p className="label-mono mb-3">Datos del estudiante</p>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Campo etiqueta="Nombres" requerido>
                <input className={claseInput} autoFocus value={datos.alumno.nombres}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, nombres: e.target.value } })} />
              </Campo>
              <Campo etiqueta="Apellidos" requerido>
                <input className={claseInput} value={datos.alumno.apellidos}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, apellidos: e.target.value } })} />
              </Campo>
              <Campo etiqueta="DNI">
                <input className={`${claseInput} font-mono`} inputMode="numeric" value={datos.alumno.dni ?? ''}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, dni: e.target.value.replace(/\D/g, '').slice(0, 8) } })} />
              </Campo>
              <Campo etiqueta="Fecha de nacimiento">
                <input type="date" className={claseInput} value={datos.alumno.fechaNacimiento ?? ''}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, fechaNacimiento: e.target.value } })} />
              </Campo>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4">
              <Campo etiqueta="Aula" requerido>
                <select className={claseInput} value={datos.alumno.aulaId}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, aulaId: Number(e.target.value) } })}>
                  {aulas.map(a => <option key={a.id} value={a.id}>{a.etiqueta}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Tarjeta RFID">
                <input className={`${claseInput} font-mono`} value={datos.alumno.tarjetaRfid ?? ''}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, tarjetaRfid: e.target.value.toUpperCase() } })}
                  placeholder="RF-88213" />
              </Campo>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-4 items-center">
              <Campo etiqueta="Correo del estudiante">
                <input type="email" className={claseInput} maxLength={160} value={datos.alumno.correo ?? ''}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, correo: e.target.value } })}
                  placeholder="valeria@gmail.com" />
              </Campo>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={datos.alumno.crearCuenta}
                  onChange={e => setDatos({ ...datos, alumno: { ...datos.alumno, crearCuenta: e.target.checked } })}
                  className="w-4 h-4 rounded border-line accent-brand cursor-pointer" />
                <span className="text-[12.5px] font-medium text-ink-2">Crear cuenta web para el estudiante</span>
              </label>
            </div>
            <p className="text-[11.5px] text-ink-3 -mt-1">
              Con correo, DNI y esta casilla marcada se crea su cuenta web y se emite su código de activación.
              Sin ella, el estudiante queda registrado sin cuenta propia (puedes activarla después).
            </p>

            <div className="border-t border-line pt-4 mt-1">
              <p className="label-mono mb-3">Datos del apoderado</p>
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Campo etiqueta="Nombres" requerido>
                  <input className={claseInput} value={datos.apoderado.nombres}
                    onChange={e => setDatos({ ...datos, apoderado: { ...datos.apoderado, nombres: e.target.value } })} />
                </Campo>
                <Campo etiqueta="Apellidos" requerido>
                  <input className={claseInput} value={datos.apoderado.apellidos}
                    onChange={e => setDatos({ ...datos, apoderado: { ...datos.apoderado, apellidos: e.target.value } })} />
                </Campo>
                <Campo etiqueta="DNI" requerido>
                  <input className={`${claseInput} font-mono`} inputMode="numeric" value={datos.apoderado.dni}
                    onChange={e => setDatos({ ...datos, apoderado: { ...datos.apoderado, dni: e.target.value.replace(/\D/g, '').slice(0, 8) } })}
                    placeholder="8 dígitos" />
                </Campo>
                <Campo etiqueta="Parentesco">
                  <select className={claseInput} value={datos.apoderado.parentesco ?? 'APODERADO'}
                    onChange={e => setDatos({ ...datos, apoderado: { ...datos.apoderado, parentesco: e.target.value } })}>
                    <option value="MADRE">Madre</option>
                    <option value="PADRE">Padre</option>
                    <option value="APODERADO">Apoderado</option>
                  </select>
                </Campo>
                <Campo etiqueta="Teléfono / WhatsApp">
                  <TelefonoInput value={datos.apoderado.telefono ?? ''}
                    onChange={v => setDatos({ ...datos, apoderado: { ...datos.apoderado, telefono: v } })}
                    placeholder="987 654 321" />
                </Campo>
                <Campo etiqueta="Correo">
                  <input type="email" className={claseInput} maxLength={160} value={datos.apoderado.correo ?? ''}
                    onChange={e => setDatos({ ...datos, apoderado: { ...datos.apoderado, correo: e.target.value } })}
                    placeholder="madre@gmail.com" />
                </Campo>
              </div>
              <p className="text-[11.5px] text-ink-3 -mt-1">
                Con correo se crea su cuenta web y se emite el código de activación. Sin correo, queda registrado para hacerlo después.
              </p>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
