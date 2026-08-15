package com.willay.repository;

import com.willay.entity.PuntoAcceso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface PuntoAccesoRepository extends JpaRepository<PuntoAcceso, Long> {
    long countByColegioId(Long colegioId);

    /** "En línea" = activo y con latido reciente. */
    long countByColegioIdAndActivoTrueAndUltimoLatidoAfter(Long colegioId, OffsetDateTime desde);

    List<PuntoAcceso> findByColegioIdAndActivoTrue(Long colegioId);

    /** Todos los lectores activos de la plataforma: la autenticación por
     *  api-key ocurre antes de conocer el colegio. */
    List<PuntoAcceso> findByActivoTrue();
}
