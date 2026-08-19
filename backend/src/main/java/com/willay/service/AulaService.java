package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.AulaDto;
import com.willay.dto.GuardarAulaRequest;
import com.willay.entity.Aula;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Gestión de aulas.
 * Un aula no se elimina si tiene estudiantes: se desactiva, conservando
 * el historial de asistencia y notas asociado a ella.
 */
@Service
@RequiredArgsConstructor
public class AulaService {

    private final AulaRepository aulaRepository;
    private final AlumnoRepository alumnoRepository;
    private final SedeRepository sedeRepository;
    private final ColegioRepository colegioRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<AulaDto> listar(Long colegioId) {
        List<Aula> aulas = aulaRepository.findByColegioIdAndActivoTrueOrderByGradoAscSeccionAsc(colegioId);
        // Un solo conteo agrupado en lugar de una consulta por aula
        Map<Long, Long> porAula = alumnoRepository.contarPorAula(colegioId).stream()
                .collect(Collectors.toMap(f -> (Long) f[0], f -> (Long) f[1]));
        return aulas.stream()
                .map(a -> new AulaDto(a.getId(), a.getNivel(), a.getGrado(), a.getSeccion(),
                        a.getAnioEscolar(), a.etiqueta(), porAula.getOrDefault(a.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AulaDto crear(Long colegioId, Long autorId, GuardarAulaRequest req, String ip) {
        Long sedeId = req.sedeId() != null ? req.sedeId()
                : sedeRepository.findFirstByColegioIdAndActivoTrue(colegioId)
                    .orElseThrow(() -> new BusinessException("El colegio no tiene ninguna sede registrada"))
                    .getId();

        Aula aula = new Aula();
        aula.setColegio(colegioRepository.getReferenceById(colegioId));
        aula.setSede(sedeRepository.getReferenceById(sedeId));
        aplicar(aula, req);

        validarDuplicado(colegioId, req, null);
        aulaRepository.save(aula);

        auditoria.registrar(AccionAuditoria.AULA_CREADA, colegioId, autorId, aula.etiqueta(), ip);
        return new AulaDto(aula.getId(), aula.getNivel(), aula.getGrado(), aula.getSeccion(),
                aula.getAnioEscolar(), aula.etiqueta(), 0);
    }

    @Transactional
    public AulaDto actualizar(Long colegioId, Long autorId, Long id, GuardarAulaRequest req, String ip) {
        Aula aula = aulaRepository.findByIdAndColegioId(id, colegioId)
                .orElseThrow(() -> new NotFoundException("Aula no encontrada"));

        long alumnos = alumnoRepository.findByAulaIdOrderByApellidosAsc(id).size();
        if (alumnos > 0) {
            throw new BusinessException(
                    "No se puede editar: el aula tiene " + alumnos + " estudiantes matriculados. "
                    + "Cambiar su grado o sección los dejaría en un aula distinta a la real.");
        }

        validarDuplicado(colegioId, req, id);
        aplicar(aula, req);

        auditoria.registrar(AccionAuditoria.AULA_ACTUALIZADA, colegioId, autorId, aula.etiqueta(), ip);
        return new AulaDto(aula.getId(), aula.getNivel(), aula.getGrado(), aula.getSeccion(),
                aula.getAnioEscolar(), aula.etiqueta(), 0);
    }

    @Transactional
    public void desactivar(Long colegioId, Long autorId, Long id, String ip) {
        Aula aula = aulaRepository.findByIdAndColegioId(id, colegioId)
                .orElseThrow(() -> new NotFoundException("Aula no encontrada"));

        long alumnos = alumnoRepository.findByAulaIdOrderByApellidosAsc(id).size();
        if (alumnos > 0) {
            throw new BusinessException(
                    "No se puede desactivar: el aula tiene " + alumnos + " estudiantes. Reasígnalos primero.");
        }
        aula.setActivo(false);
        docenteAulaRepository.deleteAll(docenteAulaRepository.findByAulaId(id));

        auditoria.registrar(AccionAuditoria.AULA_DESACTIVADA, colegioId, autorId, aula.etiqueta(), ip);
    }

    private void aplicar(Aula aula, GuardarAulaRequest req) {
        aula.setNivel(req.nivel());
        aula.setGrado(req.grado().trim());
        aula.setSeccion(req.seccion().trim().toUpperCase());
        aula.setAnioEscolar((short) req.anioEscolar());
        aula.setActivo(true);
    }

    private void validarDuplicado(Long colegioId, GuardarAulaRequest req, Long idExcluido) {
        aulaRepository.findByColegioIdAndNivelAndGradoAndSeccionAndAnioEscolar(
                        colegioId, req.nivel(), req.grado().trim(),
                        req.seccion().trim().toUpperCase(), (short) req.anioEscolar())
                .filter(a -> idExcluido == null || !a.getId().equals(idExcluido))
                .ifPresent(a -> {
                    throw new BusinessException("Ya existe el aula " + a.etiqueta() + " para ese año escolar");
                });
    }
}
