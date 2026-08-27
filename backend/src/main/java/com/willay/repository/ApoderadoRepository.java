package com.willay.repository;

import com.willay.entity.Apoderado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ApoderadoRepository extends JpaRepository<Apoderado, Long> {

    long countByColegioId(Long colegioId);

    /** Apoderados con cuenta web ya activada (indicador "familias conectadas"). */
    @Query("""
           select count(ap) from Apoderado ap
           where ap.colegio.id = :colegioId
             and ap.usuario is not null
             and ap.usuario.estado = com.willay.entity.EstadoUsuario.ACTIVO
           """)
    long contarConCuentaActiva(@Param("colegioId") Long colegioId);

    Optional<Apoderado> findByUsuarioId(Long usuarioId);

    Optional<Apoderado> findByIdAndColegioId(Long id, Long colegioId);

    Optional<Apoderado> findByColegioIdAndDni(Long colegioId, String dni);

    Page<Apoderado> findByColegioIdOrderByApellidosAsc(Long colegioId, Pageable pageable);
}
