package com.willay.service;

import com.willay.dto.DashboardStatsDto;
import com.willay.entity.Rol;
import com.willay.repository.*;
import com.willay.util.ZonaHoraria;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Indicadores del dashboard.
 *
 * Regla no negociable: el colegioId llega como parámetro desde el token
 * (nunca del cuerpo de la petición) y filtra TODAS las consultas. Un
 * colegio jamás puede ver cifras de otro.
 *
 * Una instalación nueva devuelve ceros legítimos: no hay datos inventados.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    /** Un lector se considera en línea si reportó latido en los últimos 5 minutos. */
    private static final int MINUTOS_LATIDO = 5;

    private final AlumnoRepository alumnoRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final DocenteRepository docenteRepository;
    private final ApoderadoRepository apoderadoRepository;
    private final PuntoAccesoRepository puntoAccesoRepository;
    private final ComunicadoRepository comunicadoRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public DashboardStatsDto stats(Long colegioId) {
        LocalDate hoy = LocalDate.now(ZonaHoraria.LIMA);

        // Una sola consulta agrupada en lugar de cuatro COUNT separados
        Map<String, Long> porEstado = new HashMap<>();
        for (Object[] fila : asistenciaRepository.resumenPorEstado(colegioId, hoy)) {
            porEstado.put((String) fila[0], (Long) fila[1]);
        }
        long puntuales = porEstado.getOrDefault("PUNTUAL", 0L);
        long tardanzas = porEstado.getOrDefault("TARDANZA", 0L);
        long ausentes  = porEstado.getOrDefault("AUSENTE", 0L);

        long totalAlumnos = alumnoRepository.countByColegioIdAndEstado(colegioId, "MATRICULADO");
        long docentesTotal = docenteRepository.countByColegioId(colegioId);
        long docentesActivos = docenteRepository.countByColegioIdAndEstado(colegioId, "ACTIVO");
        long apoderadosTotal = apoderadoRepository.countByColegioId(colegioId);
        long apoderadosConCuenta = apoderadoRepository.contarConCuentaActiva(colegioId);
        long lectoresTotal = puntoAccesoRepository.countByColegioId(colegioId);
        long lectoresEnLinea = puntoAccesoRepository.countByColegioIdAndActivoTrueAndUltimoLatidoAfter(
                colegioId, OffsetDateTime.now().minusMinutes(MINUTOS_LATIDO));
        long comunicados = comunicadoRepository.countByColegioIdAndPublicadoEnIsNotNull(colegioId);

        return new DashboardStatsDto(
                puntuales + tardanzas,      // presentes = quienes ya ingresaron
                totalAlumnos,
                tardanzas,
                ausentes,
                docentesActivos, docentesTotal,
                apoderadosConCuenta, apoderadosTotal,
                lectoresEnLinea, lectoresTotal,
                comunicados,
                semanaActual(colegioId, hoy));
    }

    /** Entradas por día de la semana en curso (lunes a domingo). */
    private List<DashboardStatsDto.EntradasDiaDto> semanaActual(Long colegioId, LocalDate hoy) {
        LocalDate lunes = hoy.with(DayOfWeek.MONDAY);
        LocalDate domingo = lunes.plusDays(6);

        Map<LocalDate, Long> conteo = new HashMap<>();
        for (Object[] fila : asistenciaRepository.entradasPorDia(colegioId, lunes, domingo)) {
            conteo.put((LocalDate) fila[0], (Long) fila[1]);
        }

        List<DashboardStatsDto.EntradasDiaDto> dias = new ArrayList<>(7);
        for (int i = 0; i < 7; i++) {
            LocalDate d = lunes.plusDays(i);
            String etiqueta = d.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, new Locale("es", "PE"))
                    .replace(".", "").toUpperCase();
            // Días futuros van en 0: el frontend los muestra como "—"
            dias.add(new DashboardStatsDto.EntradasDiaDto(
                    d.toString(), etiqueta, d.isAfter(hoy) ? 0L : conteo.getOrDefault(d, 0L)));
        }
        return dias;
    }
}
