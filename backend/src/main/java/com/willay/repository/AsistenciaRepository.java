package com.willay.repository;

import com.willay.entity.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {

    long countByColegioIdAndFechaAndEstado(Long colegioId, LocalDate fecha, String estado);

    java.util.Optional<Asistencia> findByAlumnoIdAndFecha(Long alumnoId, LocalDate fecha);

    List<Asistencia> findByAlumnoIdOrderByFechaDesc(Long alumnoId);

    List<Asistencia> findByColegioIdAndFechaOrderByHoraEntradaAsc(Long colegioId, LocalDate fecha);

    /**
     * Conteo por estado en una sola consulta: evita 4 viajes a la base
     * para armar los indicadores del día.
     */
    @Query("""
           select a.estado, count(a)
           from Asistencia a
           where a.colegioId = :colegioId and a.fecha = :fecha
           group by a.estado
           """)
    List<Object[]> resumenPorEstado(@Param("colegioId") Long colegioId,
                                    @Param("fecha") LocalDate fecha);

    /** Entradas registradas por día en un rango (gráfico semanal). */
    @Query("""
           select a.fecha, count(a)
           from Asistencia a
           where a.colegioId = :colegioId
             and a.fecha between :desde and :hasta
             and a.estado in ('PUNTUAL','TARDANZA')
           group by a.fecha
           order by a.fecha
           """)
    List<Object[]> entradasPorDia(@Param("colegioId") Long colegioId,
                                  @Param("desde") LocalDate desde,
                                  @Param("hasta") LocalDate hasta);
}
