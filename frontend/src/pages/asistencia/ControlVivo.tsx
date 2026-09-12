import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Radio, LogIn, LogOut, Loader2, Wifi, WifiOff, Play, CreditCard, ScanLine, Settings2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Avatar, Mono, Pill, Button, StatCard, PanelHead, cn } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import { getLecturasVivo, abrirCanalAsistencia, simularLectura, getPuntosAcceso } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { LecturaVivo, PuntoAccesoApi } from '../../types';

const ES_NATIVO = Capacitor.isNativePlatform();
/** Credencial del lector guardada en este celular: se pide una sola vez. */
const CLAVE_LECTOR_QR = 'willay-lector-qr-api-key';

/** import.meta.env.DEV es true solo con "npm run dev"; false en el build publicado. */
const ES_DESARROLLO = import.meta.env.DEV;

export default function ControlVivo() {
  const { usuario } = useAuth();
  const toast = useToast();
  const esProfesor = usuario?.rol === 'profesor';
  const esAdmin = usuario?.rol === 'admin';

  const [lecturas, setLecturas] = useState<LecturaVivo[]>([]);
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [lectores, setLectores] = useState<PuntoAccesoApi[]>([]);

  // Simulador: permite verificar el flujo completo sin el hardware
  const [simAbierto, setSimAbierto] = useState(false);
  const [tarjeta, setTarjeta] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorSim, setErrorSim] = useState<string | null>(null);
  const cerrarCanal = useRef<(() => void) | null>(null);

  // Escáner de QR nativo: el celular actúa como un lector portátil
  const [claveLector, setClaveLector] = useState(() => localStorage.getItem(CLAVE_LECTOR_QR) ?? '');
  const [configLectorAbierto, setConfigLectorAbierto] = useState(false);
  const [claveLectorInput, setClaveLectorInput] = useState(claveLector);
  const [escaneando, setEscaneando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLecturas(await getLecturasVivo());
    } catch { /* sin conexión */ } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (esAdmin) getPuntosAcceso().then(setLectores).catch(() => {}); }, [esAdmin]);

  // Canal en vivo: cada lectura del lector aparece al instante
  useEffect(() => {
    const cerrar = abrirCanalAsistencia(
      lectura => {
        setConectado(true);
        setLecturas(prev => [lectura, ...prev.filter(l => l.id !== lectura.id)].slice(0, 60));
      },
      () => setConectado(false),
    );
    cerrarCanal.current = cerrar;
    setConectado(true);
    return () => cerrar();
  }, []);

  async function enviarSimulacion() {
    setErrorSim(null);
    setEnviando(true);
    try {
      await simularLectura(tarjeta.trim().toUpperCase(), apiKey.trim());
      setSimAbierto(false);
      setTarjeta('');
      await cargar();
    } catch (e) {
      setErrorSim(e instanceof Error ? e.message : 'No se pudo registrar la lectura');
    } finally {
      setEnviando(false);
    }
  }

  function guardarClaveLector() {
    const v = claveLectorInput.trim();
    localStorage.setItem(CLAVE_LECTOR_QR, v);
    setClaveLector(v);
    setConfigLectorAbierto(false);
  }

  /**
   * El celular escanea con la cámara y manda la lectura por el mismo
   * camino que usaría el lector físico (ver simularLectura). Funciona con
   * el QR estático de la credencial o con el QR dinámico "Mi tarjeta
   * digital" del alumno — el backend decide cuál es cuál.
   */
  async function escanearQr() {
    if (!claveLector) { setClaveLectorInput(''); setConfigLectorAbierto(true); return; }
    setEscaneando(true);
    try {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) await BarcodeScanner.installGoogleBarcodeScannerModule();

      const { barcodes } = await BarcodeScanner.scan();
      const codigo = barcodes[0]?.rawValue ?? barcodes[0]?.displayValue;
      if (!codigo) return;

      const resultado = await simularLectura(codigo, claveLector, 'QR');
      toast(`${resultado.nombre} · ${resultado.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada`, 'info');
      await cargar();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo escanear el QR', 'error');
    } finally {
      setEscaneando(false);
    }
  }

  const entradas = lecturas.filter(l => l.tipo === 'ENTRADA').length;
  const salidas = lecturas.filter(l => l.tipo === 'SALIDA').length;
  const tardanzas = lecturas.filter(l => l.estado === 'TARDANZA').length;
  const enLinea = lectores.filter(l => l.enLinea).length;

  return (
    <>
      <Topbar
        title={esProfesor ? `Asistencia en vivo${usuario?.aula ? ` · ${usuario.aula}` : ''}` : 'Control en vivo'}
        subtitle={esProfesor ? 'Solo se muestran los estudiantes de tus aulas' : 'Lecturas registradas por los lectores de las puertas'}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1280px] space-y-4">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={cn('inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[12.5px] font-semibold',
            conectado ? 'border-ok/30 bg-ok-soft text-ok' : 'border-line bg-canvas text-ink-3')}>
            {conectado ? <Wifi size={14} /> : <WifiOff size={14} />}
            {conectado ? 'Canal en vivo conectado' : 'Sin conexión al canal'}
            {conectado && <span className="w-1.5 h-1.5 rounded-full bg-ok dot-live" />}
          </span>

          <div className="flex items-center gap-2">
            {ES_NATIVO && (
              <>
                <Button onClick={escanearQr} disabled={escaneando}>
                  {escaneando ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                  Escanear QR
                </Button>
                <button
                  onClick={() => { setClaveLectorInput(claveLector); setConfigLectorAbierto(true); }}
                  className="grid place-items-center w-8 h-8 rounded-[10px] border border-line text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
                  title="Configurar credencial del lector"
                >
                  <Settings2 size={14} />
                </button>
              </>
            )}
            {esAdmin && ES_DESARROLLO && (
              <Button variant="ghost" onClick={() => setSimAbierto(true)}>
                <Play size={14} /> Simular lectura
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={<LogIn size={19} strokeWidth={1.7} />} label="Entradas hoy"
            value={String(entradas)} note="Registradas por el lector" noteTone="ok" />
          <StatCard icon={<LogOut size={19} strokeWidth={1.7} />} label="Salidas hoy"
            value={String(salidas)} note="Registradas por el lector" noteTone="neutral" />
          <StatCard icon={<Radio size={19} strokeWidth={1.7} />} label="Tardanzas"
            value={String(tardanzas)} note="Ingresaron fuera de hora" noteTone="warn" />
          {esAdmin && (
            <StatCard icon={<Wifi size={19} strokeWidth={1.7} />} label="Lectores en línea"
              value={String(enLinea)} denom={String(lectores.length)}
              note={enLinea ? 'Reportando actividad' : 'Ninguno reportando'} noteTone={enLinea ? 'ok' : 'bad'} />
          )}
        </div>

        <div className="card p-6">
          <PanelHead
            title="Flujo de accesos"
            sub={cargando ? 'Cargando…' : `${lecturas.length} lecturas registradas hoy`}
          />

          {cargando ? (
            <div className="py-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
          ) : lecturas.length === 0 ? (
            <div className="py-12 text-center">
              <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-canvas text-ink-3 mb-4">
                <CreditCard size={22} />
              </span>
              <p className="text-[14px] font-semibold">Aún no hay lecturas registradas hoy</p>
              <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[420px] mx-auto">
                Cuando un estudiante pase su tarjeta por el lector, aparecerá aquí al instante.
                {esAdmin && ES_DESARROLLO && ' Puedes probarlo con el botón "Simular lectura".'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {lecturas.map((l, i) => (
                <div key={`${l.id}-${i}`}
                  className={cn('flex items-center gap-3.5 rounded-[10px] px-3 py-2.5 -mx-1 transition-colors',
                    i === 0 && 'animate-slide-in bg-brand-faint')}>
                  <Avatar nombre={l.nombre} fotoUrl={l.fotoUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{l.nombre}</p>
                    <Mono className="!text-[10.5px]">{l.grado} · {l.tarjeta} · {l.puntoAcceso}</Mono>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold',
                    l.tipo === 'ENTRADA' ? 'text-ok' : 'text-info')}>
                    {l.tipo === 'ENTRADA' ? <LogIn size={12} /> : <LogOut size={12} />}
                    {l.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                  </span>
                  <Mono className="font-semibold !text-ink !text-[13px] w-[46px] text-right">{l.hora}</Mono>
                  {l.estado === 'TARDANZA' && <Pill tone="warn">Tardanza</Pill>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Simulador de lectura: herramienta interna, solo en npm run dev */}
      {ES_DESARROLLO && (
        <Modal
          abierto={simAbierto}
          titulo="Simular una lectura"
          subtitulo="Reproduce la petición que enviará el lector físico"
          onCerrar={() => setSimAbierto(false)}
          pie={
            <>
              <Button variant="ghost" onClick={() => setSimAbierto(false)}>Cancelar</Button>
              <Button onClick={enviarSimulacion} disabled={!tarjeta.trim() || !apiKey.trim() || enviando}>
                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Enviar
              </Button>
            </>
          }
        >
          {errorSim && (
            <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorSim}</p>
          )}

          <Campo etiqueta="Código de tarjeta" requerido>
            <input className={`${claseInput} font-mono`} value={tarjeta} autoFocus
              onChange={e => setTarjeta(e.target.value.toUpperCase())} placeholder="RF-88213" />
            <p className="text-[11px] text-ink-3 mt-1.5">
              También acepta el código del estudiante (A-2041) o el contenido de su QR.
            </p>
          </Campo>

          <Campo etiqueta="Credencial del lector" requerido>
            <input className={`${claseInput} font-mono`} value={apiKey}
              onChange={e => setApiKey(e.target.value)} placeholder="wly_…" />
            <p className="text-[11px] text-ink-3 mt-1.5">
              Se obtiene al registrar el lector en Configuración → Lectores. En el entorno de
              demostración, la clave del lector precargado es <b className="font-mono">lector-demo-key</b>.
            </p>
          </Campo>

          <div className="rounded-[10px] border border-line bg-canvas p-3.5">
            <p className="label-mono mb-1.5">Petición equivalente</p>
            <pre className="text-[10.5px] font-mono text-ink-2 whitespace-pre-wrap leading-relaxed">
{`POST /api/asistencia/lectura
X-Api-Key: ${apiKey || '<credencial>'}

{ "tarjeta": "${tarjeta || 'RF-88213'}" }`}
            </pre>
          </div>
        </Modal>
      )}

      {/* Credencial del lector para el escáner de QR de este celular */}
      {ES_NATIVO && (
        <Modal
          abierto={configLectorAbierto}
          titulo="Configurar este celular como lector"
          subtitulo="Se guarda solo en este dispositivo"
          onCerrar={() => setConfigLectorAbierto(false)}
          pie={
            <>
              <Button variant="ghost" onClick={() => setConfigLectorAbierto(false)}>Cancelar</Button>
              <Button onClick={guardarClaveLector} disabled={!claveLectorInput.trim()}>Guardar</Button>
            </>
          }
        >
          <Campo etiqueta="Credencial del lector" requerido>
            <input className={`${claseInput} font-mono`} value={claveLectorInput} autoFocus
              onChange={e => setClaveLectorInput(e.target.value)} placeholder="wly_…" />
            <p className="text-[11px] text-ink-3 mt-1.5">
              Regístrala una vez en Configuración → Lectores (por ejemplo, con el nombre
              "App móvil") y pega aquí la credencial que te entrega. Con esto, este celular
              queda funcionando como un lector portátil más — no reemplaza los lectores
              físicos de las puertas.
            </p>
          </Campo>
        </Modal>
      )}
    </>
  );
}
