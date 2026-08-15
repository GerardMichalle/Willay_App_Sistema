package com.willay.repository;

import com.willay.entity.RecursoCurso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecursoCursoRepository extends JpaRepository<RecursoCurso, Long> {
    List<RecursoCurso> findByCategoriaIdOrderByOrdenAsc(Long categoriaId);
}