package com.willay.repository;

import com.willay.entity.RegistroAcceso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface RegistroAccesoRepository extends JpaRepository<RegistroAcceso, Long> {

    Optional<RegistroAcceso> findTopByAlumnoIdAndMomentoAfterOrderByMomentoDesc(
            Long alumnoId, OffsetDateTime desde);

    List<RegistroAcceso> findByColegioIdAndMomentoAfterOrderByMomentoDesc(
            Long colegioId, OffsetDateTime desde);

    List<RegistroAcceso> findByAlumnoIdAndMomentoAfterOrderByMomentoDesc(
            Long alumnoId, OffsetDateTime desde);
}
