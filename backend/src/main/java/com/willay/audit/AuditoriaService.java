package com.willay.audit;

import com.willay.dto.AuditoriaGlobalDto;
import com.willay.dto.PaginaDto;
import com.willay.entity.Auditoria;
import com.willay.entity.Colegio;
import com.willay.repository.AuditoriaRepository;
import com.willay.repository.ColegioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Registro de acciones importantes. Asíncrono para no penalizar
 * la latencia de la petición que se audita.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaService {

    private final AuditoriaRepository repositorio;
    private final ColegioRepository colegioRepository;

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

    /** Vista global del proveedor: eventos de todos los colegios juntos (solo SUPER_ADMIN). */
    @Transactional(readOnly = true)
    public PaginaDto<AuditoriaGlobalDto> listar(Long colegioId, AccionAuditoria accion, Pageable pageable) {
        Page<Auditoria> pagina = repositorio.buscar(colegioId, accion != null ? accion.name() : null, pageable);

        var idsColegio = pagina.getContent().stream()
                .map(Auditoria::getColegioId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, String> nombres = colegioRepository.findAllById(idsColegio).stream()
                .collect(Collectors.toMap(Colegio::getId, Colegio::getNombre));

        return PaginaDto.de(pagina.map(a -> new AuditoriaGlobalDto(
                a.getId(), a.getCreadoEn(), a.getColegioId(),
                a.getColegioId() != null ? nombres.get(a.getColegioId()) : null,
                a.getAccion(), a.getDetalle())));
    }
}
