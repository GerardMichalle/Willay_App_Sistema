package com.willay.repository;

import com.willay.entity.Curso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CursoRepository extends JpaRepository<Curso, Long> {
    List<Curso> findByColegioIdAndActivoTrueOrderByNombreAsc(Long colegioId);
    Optional<Curso> findByIdAndColegioId(Long id, Long colegioId);
}
