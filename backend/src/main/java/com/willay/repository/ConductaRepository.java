package com.willay.repository;

import com.willay.entity.Conducta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConductaRepository extends JpaRepository<Conducta, Long> {
    List<Conducta> findByAlumnoIdOrderByFechaDesc(Long alumnoId);
    List<Conducta> findByColegioIdOrderByFechaDesc(Long colegioId);
    long countByColegioIdAndTipo(Long colegioId, String tipo);
}
