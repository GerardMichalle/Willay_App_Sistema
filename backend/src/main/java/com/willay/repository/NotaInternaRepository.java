package com.willay.repository;

import com.willay.entity.NotaInterna;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotaInternaRepository extends JpaRepository<NotaInterna, Long> {

    @Query("""
           select n from NotaInterna n
           join fetch n.autor
           where n.colegio.id = :colegioId
           order by n.creadoEn desc
           """)
    List<NotaInterna> listarDelColegio(@Param("colegioId") Long colegioId);

    Optional<NotaInterna> findByIdAndColegioId(Long id, Long colegioId);
}
