import { useEffect, useState } from 'react';
import { Avatar, Mono } from './ui';
import { getLecturasVivo, abrirCanalAsistencia } from '../services/api';
import type { LecturaVivo } from '../types';

/** Lecturas de la puerta en tiempo real: estado inicial por API + canal SSE. */
export default function GateTicker() {
  const [lecturas, setLecturas] = useState<LecturaVivo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getLecturasVivo().then(setLecturas).catch(() => {}).finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const cerrar = abrirCanalAsistencia(lectura => {
      setLecturas(prev => [lectura, ...prev.filter(l => l.id !== lectura.id)].slice(0, 20));
    });
    return () => cerrar();
  }, []);

  const recientes = lecturas.slice(0, 6);

  return (
    <div className="card flex items-stretch overflow-hidden animate-rise">
      <div className="flex items-center gap-3 px-5 py-4 shrink-0">
        <span className="w-3 h-3 rounded-full bg-brand dot-live" />
        <span className="label-mono !text-ink font-semibold">Puerta principal</span>
      </div>
      {!cargando && recientes.length === 0 ? (
        <div className="flex items-center px-5 flex-1">
          <p className="text-[12.5px] text-ink-3">Sin actividad registrada hoy</p>
        </div>
      ) : (
        <div className="flex items-stretch overflow-hidden flex-1 [mask-image:linear-gradient(90deg,#000_85%,transparent)]">
          {recientes.map(l => (
            <div key={l.id} className="flex items-center gap-3 px-5 border-l border-line shrink-0 animate-slide-in">
              <Avatar nombre={l.nombre} size="sm" />
              <div className="leading-tight">
                <p className="text-[12.5px] font-semibold whitespace-nowrap">{l.nombre}</p>
                <Mono className="!text-[10.5px] whitespace-nowrap">{l.grado} · {l.tarjeta}</Mono>
              </div>
              <Mono className={`!text-[12px] font-semibold ${l.estado === 'TARDANZA' ? '!text-warn' : '!text-ok'}`}>{l.hora}</Mono>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
