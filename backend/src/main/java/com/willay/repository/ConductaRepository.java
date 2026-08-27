package com.willay.repository;

import com.willay.entity.Conducta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConductaRepository extends JpaRepository<Conducta, Long> {
    List<Conducta> findByAlumnoIdOrderByFechaDesc(Long alumnoId);
    List<Conducta> findByColegioIdOrderByFechaDesc(Long colegioId);
    long countByColegioIdAndTipo(Long colegioId, String tipo);

    /** Pantalla "Conducta" de Admin/Dirección: todo el colegio, con filtro de tipo opcional. */
    @Query("""
           select c from Conducta c
           where c.colegio.id = :colegioId
             and (:tipo is null or c.tipo = :tipo)
           order by c.fecha desc
           """)
    Page<Conducta> buscar(@Param("colegioId") Long colegioId, @Param("tipo") String tipo, Pageable pageable);
}
