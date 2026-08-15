package com.willay.audit;

import com.willay.entity.Auditoria;
import com.willay.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Registro de acciones importantes. Asíncrono para no penalizar
 * la latencia de la petición que se audita.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaService {

    private final AuditoriaRepository repositorio;

    @Async
    public void registrar(AccionAuditoria accion, Long colegioId, Long usuarioId, String detalle, String ip) {
        try {
            Auditoria a = new Auditoria();
            a.setAccion(accion.name());
            a.setColegioId(colegioId);
            a.setUsuarioId(usuarioId);
            a.setDetalle(detalle);
            a.setIp(ip);
            repositorio.save(a);
        } catch (Exception e) {
            // La auditoría nunca debe tumbar la operación principal
            log.error("No se pudo registrar auditoría {}: {}", accion, e.getMessage());
        }
    }
}
