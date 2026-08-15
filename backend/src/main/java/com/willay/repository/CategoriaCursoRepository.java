package com.willay.repository;

import com.willay.entity.CategoriaCurso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaCursoRepository extends JpaRepository<CategoriaCurso, Long> {
    List<CategoriaCurso> findByCursoIdOrderByOrdenAsc(Long cursoId);
    Optional<CategoriaCurso> findByIdAndCursoId(Long id, Long cursoId);
}