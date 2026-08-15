import { useCallback, useEffect, useState } from 'react';
import { Plus, Loader2, Megaphone, Send, Pencil, Trash2, Eye, Users } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { Mono, Pill, Button, FilterTabs } from '../../components/ui';
import Modal, { Campo, claseInput } from '../../components/Modal';
import {
  getComunicadosApi, crearComunicado, actualizarComunicado, publicarComunicado,
  eliminarComunicado, marcarComunicadoLeido, getAulas, type DatosComunicado,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import type { ComunicadoApi, Aula } from '../../types';

const DESTINATARIOS = [
  { id: 'TODOS', label: 'Toda la comunidad' },
  { id: 'APODERADOS', label: 'Solo apoderados' },
  { id: 'DOCENTES', label: 'Solo docentes' },
  { id: 'ALUMNOS', label: 'Solo estudiantes' },
];

const VACIO: DatosComunicado = { titulo: '', cuerpo: '', dirigidoA: 'TODOS', aulaId: null, publicar: true };

export default function Comunicados() {
  const { usuario } = useAuth();
  const puedePublicar = ['admin', 'direccion', 'profesor'].includes(usuario?.rol ?? '');
  const puedeEliminar = ['admin', 'direccion'].includes(usuario?.rol ?? '');

  const [lista, setLista] = useState<ComunicadoApi[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [tab, setTab] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ComunicadoApi | null>(null);
  const [datos, setDatos] = useState<DatosComunicado>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState<ComunicadoApi | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setLista(await getComunicadosApi());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los comunicados');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (puedePublicar) getAulas().then(setAulas).catch(() => {}); }, [puedePublicar]);

  function abrirNuevo() {
    setEditando(null);
    setDatos(VACIO);
    setErrorForm(null);
    setAbierto(true);
  }

  function abrirEdicion(c: ComunicadoApi) {
    setEditando(c);
    setDatos({ titulo: c.titulo, cuerpo: c.cuerpo, dirigidoA: c.dirigidoA, aulaId: c.aulaId, publicar: c.publicado });
    setErrorForm(null);
    setAbierto(true);
  }

  async function guardar(publicarAhora: boolean) {
    setErrorForm(null);
    setGuardando(true);
    try {
      const cuerpo = { ...datos, publicar: publicarAhora };
      if (editando) await actualizarComunicado(editando.id, cuerpo);
      else await crearComunicado(cuerpo);
      setAbierto(false);
      await cargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function publicar(c: ComunicadoApi) {
    try {
      await publicarComunicado(c.id);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo publicar');
    }
  }

  async function eliminar(c: ComunicadoApi) {
    if (!confirm(`¿Eliminar el comunicado "${c.titulo}"?`)) return;
    try {
      await eliminarComunicado(c.id);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }

  async function abrirLectura(c: ComunicadoApi) {
    setLeyendo(c);
    if (!c.leidoPorMi && c.publicado) {
      try {
        await marcarComunicadoLeido(c.id);
        setLista(l => l.map(x => (x.id === c.id ? { ...x, leidoPorMi: true, lecturas: x.lecturas + 1 } : x)));
      } catch { /* no crítico */ }
    }
  }

  const filtrados = lista.filter(c => {
    if (tab === 'Publicados') return c.publicado;
    if (tab === 'Borradores') return !c.publicado;
    if (tab === 'Sin leer') return c.publicado && !c.leidoPorMi;
    return true;
  });

  const tabs = puedePublicar ? ['Todos', 'Publicados', 'Borradores'] : ['Todos', 'Sin leer'];
  const formValido = datos.titulo.trim() !== '' && datos.cuerpo.trim() !== '';

  return (
    <>
      <Topbar
        title="Comunicados"
        subtitle={cargando ? 'Cargando…' : `${lista.filter(c => c.publicado).length} publicados`}
      />
      <div className="px-4 sm:px-8 pb-10 max-w-[1100px] space-y-4">

        {error && (
          <div className="card p-4 border-bad/30 bg-bad-soft/40">
            <p className="text-[12.5px] text-bad font-medium">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FilterTabs tabs={tabs} active={tab} onChange={setTab} />
          {puedePublicar && <Button onClick={abrirNuevo}><Plus size={14} /> Redactar comunicado</Button>}
        </div>

        {cargando ? (
          <div className="card p-12 grid place-items-center text-ink-3"><Loader2 size={22} className="animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="card p-12 text-center">
            <span className="inline-grid place-items-center w-12 h-12 rounded-[14px] bg-brand-soft text-brand mb-4">
              <Megaphone size={22} />
            </span>
            <p className="text-[14px] font-semibold">
              {lista.length === 0 ? 'Aún no hay comunicados' : 'Nada en este filtro'}
            </p>
            <p className="text-[12.5px] text-ink-3 mt-1.5">
              {puedePublicar
                ? 'Publica un aviso y llegará como notificación a sus destinatarios.'
                : 'Los avisos del colegio aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(c => (
              <div key={c.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center w-10 h-10 rounded-[11px] bg-brand-soft text-brand shrink-0">
                    <Megaphone size={17} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <button onClick={() => abrirLectura(c)} className="text-left cursor-pointer group">
                        <p className="text-[14px] font-bold tracking-tight group-hover:text-brand transition-colors">
                          {c.titulo}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        {!c.publicado && <Pill tone="warn">Borrador</Pill>}
                        {c.publicado && !c.leidoPorMi && <Pill tone="brand">Nuevo</Pill>}
                        {c.aula && <Pill tone="neutral">{c.aula}</Pill>}
                      </div>
                    </div>

                    <p className="text-[12.5px] text-ink-2 mt-1.5 line-clamp-2">{c.cuerpo}</p>

                    <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                      <Mono className="!text-[10.5px]">
                        {c.autor} · {c.publicadoEn ?? 'sin publicar'} · {DESTINATARIOS.find(d => d.id === c.dirigidoA)?.label}
                      </Mono>

                      <div className="flex items-center gap-3">
                        {c.publicado && (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                            <Eye size={12} /> {c.lecturas}/{c.destinatarios} leídos
                          </span>
                        )}
                        {puedePublicar && !c.publicado && (
                          <button onClick={() => publicar(c)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:text-brand-strong cursor-pointer">
                            <Send size={12} /> Publicar
                          </button>
                        )}
                        {puedePublicar && (
                          <button onClick={() => abrirEdicion(c)} title="Editar"
                            className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-ink hover:bg-canvas transition-colors cursor-pointer">
                            <Pencil size={12} />
                          </button>
                        )}
                        {puedeEliminar && (
                          <button onClick={() => eliminar(c)} title="Eliminar"
                            className="grid place-items-center w-7 h-7 rounded-[8px] text-ink-3 hover:text-bad hover:bg-bad-soft transition-colors cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {c.publicado && c.destinatarios > 0 && (
                      <div className="mt-2.5 h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div className="h-full bg-brand rounded-full transition-[width] duration-700"
                          style={{ width: `${Math.min(100, (c.lecturas / c.destinatarios) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redacción */}
      <Modal
        abierto={abierto}
        titulo={editando ? 'Editar comunicado' : 'Nuevo comunicado'}
        subtitulo="Al publicarlo, cada destinatario recibirá una notificación"
        onCerrar={() => setAbierto(false)}
        pie={
          <>
            <Button variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button variant="ghost" onClick={() => guardar(false)} disabled={!formValido || guardando}>
              Guardar borrador
            </Button>
            <Button onClick={() => guardar(true)} disabled={!formValido || guardando}>
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publicar
            </Button>
          </>
        }
      >
        {errorForm && (
          <p className="mb-4 rounded-[10px] bg-bad-soft text-bad text-[12px] font-medium px-3.5 py-2.5">{errorForm}</p>
        )}

        <Campo etiqueta="Título" requerido>
          <input className={claseInput} value={datos.titulo} autoFocus
            onChange={e => setDatos({ ...datos, titulo: e.target.value })}
            placeholder="Horario especial por Fiestas Patrias" />
        </Campo>

        <Campo etiqueta="Contenido" requerido>
          <textarea className={`${claseInput} min-h-[120px] resize-y`} value={datos.cuerpo}
            onChange={e => setDatos({ ...datos, cuerpo: e.target.value })}
            placeholder="Escribe aquí el aviso…" />
        </Campo>

        <div className="grid sm:grid-cols-2 gap-x-4">
          <Campo etiqueta="Dirigido a">
            <select className={claseInput} value={datos.dirigidoA}
              onChange={e => setDatos({ ...datos, dirigidoA: e.target.value })}>
              {DESTINATARIOS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Aula">
            <select className={claseInput} value={datos.aulaId ?? ''}
              onChange={e => setDatos({ ...datos, aulaId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Todo el colegio</option>
              {aulas.map(a => <option key={a.id} value={a.id}>{a.etiqueta}</option>)}
            </select>
          </Campo>
        </div>

        <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Users size={12} /> Un borrador solo lo ves tú hasta que lo publiques.
        </p>
      </Modal>

      {/* Lectura */}
      <Modal
        abierto={leyendo !== null}
        titulo={leyendo?.titulo ?? ''}
        subtitulo={leyendo ? `${leyendo.autor} · ${leyendo.publicadoEn ?? 'borrador'}` : undefined}
        onCerrar={() => setLeyendo(null)}
        pie={<Button onClick={() => setLeyendo(null)}>Cerrar</Button>}
      >
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{leyendo?.cuerpo}</p>
      </Modal>
    </>
  );
}
