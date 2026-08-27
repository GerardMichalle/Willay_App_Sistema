package com.willay.repository;

import com.willay.entity.Docente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocenteRepository extends JpaRepository<Docente, Long> {
    long countByColegioId(Long colegioId);
    long countByColegioIdAndEstado(Long colegioId, String estado);
    Page<Docente> findByColegioIdOrderByIdAsc(Long colegioId, Pageable pageable);
    Optional<Docente> findByUsuarioId(Long usuarioId);
}
