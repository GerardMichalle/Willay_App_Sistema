package com.willay.repository;

import com.willay.entity.CursoGratuito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CursoGratuitoRepository extends JpaRepository<CursoGratuito, Long> {

    @Query("""
           select c from CursoGratuito c
           where c.activo = true and (c.colegio is null or c.colegio.id = :colegioId)
           order by c.orden asc, c.id asc
           """)
    List<CursoGratuito> catalogoPara(Long colegioId);

    List<CursoGratuito> findByActivoTrueOrderByOrdenAscIdAsc();
}