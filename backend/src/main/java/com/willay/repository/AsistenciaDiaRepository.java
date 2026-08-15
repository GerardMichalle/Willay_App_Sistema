package com.willay.repository;

import com.willay.entity.Asistencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * Consultas de asistencia orientadas al listado de alumnos.
 * Separado de AsistenciaRepository (dashboard) para mantener cada
 * repositorio enfocado en su caso de uso.
 */
public interface AsistenciaDiaRepository extends JpaRepository<Asistencia, Long> {

    /** Asistencia de hoy de un conjunto de alumnos: evita el problema N+1. */
    @Query("""
           select a from Asistencia a
           where a.fecha = :fecha and a.alumno.id in :alumnos
           """)
    List<Asistencia> delDia(@Param("fecha") LocalDate fecha,
                            @Param("alumnos") Collection<Long> alumnos);
}
