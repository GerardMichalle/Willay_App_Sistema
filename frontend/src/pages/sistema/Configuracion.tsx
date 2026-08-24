import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, Save, Clock, Building2, Radio, Plus, KeyRound, Copy, Trash2, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Mono, Pill, Button, PanelHead } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import {
  getConfiguracion, guardarConfiguracion, getPuntosAcceso, crearPuntoAcceso,
  regenerarClaveLector, desactivarPuntoAcceso,
} from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import type { PuntoAccesoApi } from '../../types';

export default function Configuracion() {
  const confirmar = useConfirm();
  const toast = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [lectores, setLectores] = useState<PuntoAccesoApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lectorAbierto, setLectorAbierto] = useState(false);
  const [nombreLector, setNombreLector] = useState('');
  const [claveNueva, setClaveNueva] = useState<{ nombre: string; clave: string } | null>(null);
  const [creandoLector, setCreandoLector] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, l] = await Promise.all([getConfiguracion(), getPuntosAcceso()]);
      setConfig(c);
      setOriginal(c);
      setLectores(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const cambiado = JSON.stringify(config) !== JSON.stringify(original);

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    setError(null);
    try {
      const cambios: Record<string, string> = {};
      Object.entries(config).forEach(([k, v]) => { if (original[k] !== v) cambios[k] = v; });
      const actualizado = await guardarConfiguracion(cambios);
      setConfig(actualizado);
      setOriginal(actualizado);
      setMensaje('Configuración guardada');
      setTimeout(() => setMensaje(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function crearLector() {
    setCreandoLector(true);
    try {
      const p = await crearPuntoAcceso(nombreLector);
      if (p.apiKeyNueva) setClaveNueva({ nombre: p.nombre, clave: p.apiKeyNueva });
      setNombreLector('');
      setLectorAbierto(false);
      setLectores(await getPuntosAcceso());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo registrar el lector');
    } finally {
      setCreandoLector(false);
    }
  }

  async function regenerar(l: PuntoAccesoApi) {
    if (!(await confirmar({
      titulo: `¿Generar una credencial nueva para "${l.nombre}"?`,
      mensaje: 'La anterior dejará de funcionar y habrá que reconfigurar el dispositivo.',
      textoConfirmar: 'Generar',
    }))) return;
    try {
      const p = await regenerarClaveLector(l.id);
      if (p.apiKeyNueva) setClaveNueva({ nombre: p.nombre, clave: p.apiKeyNueva });
      setLectores(await getPuntosAcceso());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo regenerar');
    }
  }

  async function quitar(l: PuntoAccesoApi) {
    if (!(await confirmar({
      titulo: `¿Desactivar el lector "${l.nombre}"?`,
      mensaje: 'Dejará de aceptar lecturas de tarjetas.',
      textoConfirmar: 'Desactivar',
    }))) return;
    try {
      await desactivarPuntoAcceso(l.id);
      setLectores(await getPuntosAcceso());
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo desactivar');
    }
  }

  const campo = (clave: string, valor: string) => setConfig({ ...config, [clave]: valor });

  return (
    <>
      <Topbar title="Configuración" subtitle="Parámetros del colegio y lectores instalados" />
      <div className="px-4 sm:px-8 pb-10 max-w-[900px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}
        {mensaje && (
          <div className="card p-4 border-ok/30 bg-ok-soft/40">
            <p className="text-[12.5px] text-ok font-medium">{mensaje}</p>
          </div>
        )}

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : (
          <>
            <div className="card p-6">
              <PanelHead title="Datos de la institución" right={<Building2 size={16} className="text-ink-3" />} />
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Campo etiqueta="Nombre del colegio">
                  <input className={claseInput} value={config.COLEGIO_NOMBRE ?? ''}
                    onChange={e => campo('COLEGIO_NOMBRE', e.target.value)} />
                </Campo>
                <Campo etiqueta="Código modular">
                  <input className={`${claseInput} font-mono`} value={config.COLEGIO_CODIGO_MODULAR ?? ''}
                    onChange={e => campo('COLEGIO_CODIGO_MODULAR', e.target.value)} />
                </Campo>
                <Campo etiqueta="RUC">
                  <input className={`${claseInput} font-mono`} value={config.COLEGIO_RUC ?? ''}
                    onChange={e => campo('COLEGIO_RUC', e.target.value.replace(/\D/g, '').slice(0, 11))} />
                </Campo>
                <Campo etiqueta="Año escolar">
                  <input className={`${claseInput} font-mono`} value={config.ANIO_ESCOLAR ?? ''}
                    onChange={e => campo('ANIO_ESCOLAR', e.target.value)} />
                </Campo>
              </div>
            </div>

            <div className="card p-6">
              <PanelHead
                title="Control de asistencia"
                sub="Define desde qué hora se considera tardanza"
                right={<Clock size={16} className="text-ink-3" />}
              />
              <div className="grid sm:grid-cols-2 gap-x-4">
                <Campo etiqueta="Hora de tolerancia">
                  <input type="time" className={`${claseInput} font-mono`} value={config.HORA_TOLERANCIA ?? '08:00'}
                    onChange={e => campo('HORA_TOLERANCIA', e.target.value)} />
                  <p className="text-[11px] text-ink-3 mt-1.5">
                    Quien ingrese después de esta hora quedará marcado como tardanza.
                  </p>
                </Campo>
                <Campo etiqueta="Canal de avisos">
                  <select className={claseInput} value={config.CANAL_AVISOS ?? 'APP'}
                    onChange={e => campo('CANAL_AVISOS', e.target.value)}>
                    <option value="APP">Solo en la aplicación</option>
                    <option value="WHATSAPP">Aplicación y WhatsApp</option>
                  </select>
                  <p className="text-[11px] text-ink-3 mt-1.5">
                    El envío por WhatsApp requiere contratar el servicio de mensajería.
                  </p>
                </Campo>
              </div>
            </div>

            <div className="card p-6">
              <PanelHead
                title="Lectores instalados"
                sub={`${lectores.filter(l => l.enLinea).length} de ${lectores.length} reportando actividad`}
                right={<Button variant="ghost" onClick={() => setLectorAbierto(true)}><Plus size={14} /> Registrar lector</Button>}
              />

              {lectores.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="inline-grid place-items-center w-11 h-11 rounded-[12px] bg-canvas text-ink-3 mb-3">
                    <Radio size={19} />
                  </span>
                  <p className="text-[13px] font-semibold">Aún no hay lectores registrados</p>
                  <p className="text-[12px] text-ink-3 mt-1 max-w-[380px] mx-auto">
                    Al registrar uno obtendrás su credencial, que se configura en el dispositivo físico.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lectores.map(l => (
                    <div key={l.id} className="flex items-center gap-3 rounded-[10px] border border-line px-4 py-3">
                      <span className={`grid place-items-center w-9 h-9 rounded-[10px] shrink-0 ${
                        l.enLinea ? 'bg-ok-soft text-ok' : 'bg-canvas text-ink-3'}`}>
                        {l.enLinea ? <Wifi size={15} /> : <WifiOff size={15} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold">{l.nombre}</p>
                        <Mono className="!text-[10.5px]">
                          {l.ultimoLatido ? `Última lectura: ${l.ultimoLatido}` : 'Sin actividad registrada'}
                        </Mono>
                      </div>
                      <Pill tone={l.enLinea ? 'ok' : 'neutral'}>{l.enLinea ? 'En línea' : 'Sin señal'}</Pill>
                      <button onClick={() => regenerar(l)} title="Regenerar credencial"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => quitar(l)} title="Desactivar"
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-[10px] border border-line bg-canvas p-4">
                <p className="label-mono mb-1.5">Configuración del dispositivo</p>
                <p className="text-[12px] text-ink-2 leading-relaxed">
                  El lector debe enviar cada pasada de tarjeta a la siguiente dirección, incluyendo su
                  credencial en la cabecera <Mono className="!text-[11px]">X-Api-Key</Mono>:
                </p>
                <pre className="mt-2 text-[10.5px] font-mono text-ink-2 whitespace-pre-wrap leading-relaxed">
{`POST ${window.location.origin}/api/asistencia/lectura
Content-Type: application/json
X-Api-Key: <credencial del lector>

{ "tarjeta": "<código leído>" }`}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfig(original)} disabled={!cambiado}>Descartar</Button>
              <Button onClick={guardar} disabled={!cambiado || guardando}>
                {guardando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar cambios
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        abierto={lectorAbierto}
        titulo="Registrar lector"
        subtitulo="Obtendrás una credencial única para el dispositivo"
        onCerrar={() => setLectorAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setLectorAbierto(false)}>Cancelar</Button>
            <Button onClick={crearLector} disabled={!nombreLector.trim() || creandoLector}>
              {creandoLector ? <Loader2 size={14} className="animate-spin" /> : null} Registrar
            </Button>
          </>
        }
      >
        <Campo etiqueta="Nombre del lector" requerido>
          <input className={claseInput} value={nombreLector} autoFocus
            onChange={e => setNombreLector(e.target.value)}
            placeholder="Puerta principal · Lector A" />
          <p className="text-[11px] text-ink-3 mt-1.5">
            Usa un nombre que identifique la puerta donde está instalado.
          </p>
        </Campo>
      </Modal>

      <Modal
        abierto={claveNueva !== null}
        titulo="Credencial del lector"
        subtitulo={claveNueva?.nombre}
        onCerrar={() => setClaveNueva(null)}
        pie={<Button onClick={() => setClaveNueva(null)}>Ya la guardé</Button>}
      >
        <div className="rounded-[12px] border border-line p-4">
          <div className="flex items-center gap-2">
            <KeyRound size={15} className="text-brand shrink-0" />
            <Mono className="!text-[13px] font-bold !text-ink break-all flex-1">{claveNueva?.clave}</Mono>
            <button
              onClick={() => navigator.clipboard?.writeText(claveNueva?.clave ?? '')}
              className="grid place-items-center w-8 h-8 rounded-[9px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer shrink-0"
              title="Copiar"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
        <p className="text-[12px] text-ink-3 mt-4">
          Cópiala ahora: por seguridad no vuelve a mostrarse. Si la pierdes, genera una nueva
          desde el listado de lectores.
        </p>
      </Modal>
    </>
  );
}
