package com.willay.service;

import com.willay.dto.LecturaDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Difusión de lecturas en tiempo real mediante Server-Sent Events.
 *
 * Se eligió SSE sobre WebSocket porque el flujo es unidireccional
 * (servidor → navegador), viaja sobre HTTP normal —lo que evita problemas
 * con proxys y cortafuegos de colegios— y el navegador reconecta solo si
 * se cae la conexión.
 *
 * Las suscripciones se agrupan por colegio: una lectura del Colegio A
 * jamás llega a una pantalla del Colegio B.
 */
@Service
@Slf4j
public class MonitorAsistenciaService {

    /** 30 minutos: el navegador reconecta automáticamente al expirar. */
    private static final long TIEMPO_VIDA_MS = 30 * 60 * 1000L;

    private final Map<Long, List<SseEmitter>> suscriptores = new ConcurrentHashMap<>();

    public SseEmitter suscribir(Long colegioId) {
        SseEmitter emisor = new SseEmitter(TIEMPO_VIDA_MS);
        List<SseEmitter> lista = suscriptores.computeIfAbsent(colegioId, k -> new CopyOnWriteArrayList<>());
        lista.add(emisor);

        emisor.onCompletion(() -> lista.remove(emisor));
        emisor.onTimeout(() -> { emisor.complete(); lista.remove(emisor); });
        emisor.onError(e -> lista.remove(emisor));

        try {
            // Evento inicial: confirma al navegador que el canal quedó abierto
            emisor.send(SseEmitter.event().name("conectado").data("ok"));
        } catch (IOException e) {
            lista.remove(emisor);
        }
        return emisor;
    }

    /** Empuja una lectura a todas las pantallas del colegio. */
    public void difundir(Long colegioId, LecturaDto lectura) {
        List<SseEmitter> lista = suscriptores.get(colegioId);
        if (lista == null || lista.isEmpty()) return;

        for (SseEmitter emisor : lista) {
            try {
                emisor.send(SseEmitter.event().name("lectura").data(lectura));
            } catch (Exception e) {
                // Cliente desconectado: se retira sin afectar al resto
                lista.remove(emisor);
            }
        }
    }

    public int conexionesActivas(Long colegioId) {
        return suscriptores.getOrDefault(colegioId, List.of()).size();
    }
}
