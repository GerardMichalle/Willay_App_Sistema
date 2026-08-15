package com.willay.service;

import com.willay.dto.SetupEstadoDto;
import com.willay.entity.Colegio;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Estado del asistente de configuración inicial.
 *
 * Un colegio recién instalado ve una plataforma vacía. Este servicio le
 * indica qué falta y en qué orden, para que la puesta en marcha sea un
 * proceso guiado y no un descubrimiento por ensayo y error.
 */
@Service
@RequiredArgsConstructor
public class SetupService {

    private final ColegioRepository colegioRepository;
    private final AulaRepository aulaRepository;
    private final DocenteRepository docenteRepository;
    private final AlumnoRepository alumnoRepository;
    private final PuntoAccesoRepository puntoAccesoRepository;

    @Transactional(readOnly = true)
    public SetupEstadoDto estado(Long colegioId) {
        Colegio colegio = colegioRepository.findById(colegioId)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));

        long aulas = aulaRepository.countByColegioIdAndActivoTrue(colegioId);
        long docentes = docenteRepository.countByColegioId(colegioId);
        long alumnos = alumnoRepository.countByColegioIdAndEstado(colegioId, "MATRICULADO");
        long lectores = puntoAccesoRepository.countByColegioId(colegioId);
        boolean logo = colegio.getLogoUrl() != null && !colegio.getLogoUrl().isBlank();

        // Cada hito vale lo mismo: el progreso refleja pasos completados
        int hechos = 0;
        if (logo) hechos++;
        if (aulas > 0) hechos++;
        if (alumnos > 0) hechos++;
        if (docentes > 0) hechos++;
        if (lectores > 0) hechos++;

        String siguiente =
                aulas == 0    ? "Crea las aulas del año escolar"
              : alumnos == 0  ? "Importa o registra a los estudiantes"
              : docentes == 0 ? "Da de alta a los docentes y asígnales aulas"
              : lectores == 0 ? "Registra los lectores RFID de las puertas"
              : !logo         ? "Sube el logo del colegio"
              : "Configuración completa";

        return new SetupEstadoDto(colegio.getNombre(), logo, aulas, docentes, alumnos, lectores,
                hechos == 5, hechos * 20, siguiente);
    }
}
