package com.willay.repository;

import com.willay.entity.Libreta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LibretaRepository extends JpaRepository<Libreta, Long> {

    Optional<Libreta> findByAlumnoIdAndPeriodoAndAnioEscolar(Long alumnoId, String periodo, short anio);

    List<Libreta> findByAlumnoIdOrderByAnioEscolarDescPeriodoDesc(Long alumnoId);

    List<Libreta> findByColegioIdAndAnioEscolar(Long colegioId, short anio);

    List<Libreta> findByAlumnoIdAndPublicadaEnIsNotNullOrderByAnioEscolarDesc(Long alumnoId);

    /** A quién pertenece un archivo escaneado: usado por ArchivoService para el control de acceso. */
    Optional<Libreta> findByArchivoUuid(UUID archivoUuid);
}
