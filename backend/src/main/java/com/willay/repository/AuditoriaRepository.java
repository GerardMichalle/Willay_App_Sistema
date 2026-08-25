package com.willay.repository;

import com.willay.entity.Auditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    /** Vista global del proveedor: todos los colegios juntos, con filtros opcionales. */
    @Query("""
           select a from Auditoria a
           where (:colegioId is null or a.colegioId = :colegioId)
             and (:accion is null or a.accion = :accion)
           order by a.creadoEn desc
           """)
    Page<Auditoria> buscar(@Param("colegioId") Long colegioId,
                           @Param("accion") String accion,
                           Pageable pageable);
}
