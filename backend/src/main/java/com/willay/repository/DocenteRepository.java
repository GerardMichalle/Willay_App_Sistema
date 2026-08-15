package com.willay.repository;

import com.willay.entity.Docente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DocenteRepository extends JpaRepository<Docente, Long> {
    long countByColegioId(Long colegioId);
    long countByColegioIdAndEstado(Long colegioId, String estado);
    List<Docente> findByColegioIdOrderByIdAsc(Long colegioId);
    Optional<Docente> findByUsuarioId(Long usuarioId);
}
