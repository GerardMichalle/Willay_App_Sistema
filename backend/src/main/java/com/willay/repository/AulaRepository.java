package com.willay.repository;

import com.willay.entity.Aula;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AulaRepository extends JpaRepository<Aula, Long> {
    List<Aula> findByColegioIdAndActivoTrueOrderByGradoAscSeccionAsc(Long colegioId);
    Optional<Aula> findByIdAndColegioId(Long id, Long colegioId);
    long countByColegioIdAndActivoTrue(Long colegioId);

    java.util.Optional<Aula> findByColegioIdAndNivelAndGradoAndSeccionAndAnioEscolar(
            Long colegioId, String nivel, String grado, String seccion, short anioEscolar);
}
