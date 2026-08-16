package com.willay.security;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limita los intentos de acceso fallidos, por identificador (correo o IP).
 *
 * En memoria, no en base de datos: la decisión de bloquear debe ser rápida y
 * no debe añadir una escritura a la base de datos en cada intento fallido.
 * Para un único servidor es suficiente; si en el futuro se despliega en
 * múltiples instancias, debe migrarse a un almacén compartido (Redis).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IntentosAccesoService {

    private final AuditoriaService auditoria;

    private final ConcurrentHashMap<String, AtomicInteger> fallos = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> bloqueados = new ConcurrentHashMap<>();

    @Value("${willay.seguridad.max-intentos:5}")
    private int maxIntentos;

    @Value("${willay.seguridad.minutos-bloqueo:15}")
    private int minutosBloqueo;

    /** Lanza BusinessException si el identificador está bloqueado ahora mismo. */
    public void verificarNoBloqueado(String identificador) {
        String clave = normalizar(identificador);
        Instant hasta = bloqueados.get(clave);
        if (hasta != null) {
            if (Instant.now().isBefore(hasta)) {
                long minutosRestantes = Math.max(1, Duration.between(Instant.now(), hasta).toMinutes());
                throw new BusinessException(
                        "Demasiados intentos. Vuelve a intentarlo en " + minutosRestantes + " minutos.");
            }
            // el bloqueo ya expiró: se limpia
            bloqueados.remove(clave);
            fallos.remove(clave);
        }
    }

    /** Registra un intento fallido; bloquea si se alcanzó el máximo. */
    public void registrarFallo(String identificador) {
        String clave = normalizar(identificador);
        int total = fallos.computeIfAbsent(clave, k -> new AtomicInteger(0)).incrementAndGet();
        if (total >= maxIntentos) {
            bloqueados.put(clave, Instant.now().plus(Duration.ofMinutes(minutosBloqueo)));
            log.warn("Bloqueado temporalmente por intentos fallidos: {}", clave);
            // detalle solo: "clave" no siempre es una IP (puede ser un correo, o
            // "activacion:" + ip), y la columna ip está pensada para IPs reales.
            auditoria.registrar(AccionAuditoria.ACCESO_BLOQUEADO_POR_INTENTOS, null, null, clave, null);
        }
    }

    /** Limpia el historial ante un acceso correcto. */
    public void registrarExito(String identificador) {
        String clave = normalizar(identificador);
        fallos.remove(clave);
        bloqueados.remove(clave);
    }

    private String normalizar(String identificador) {
        return identificador.trim().toLowerCase();
    }
}
