package com.willay.repository;

import com.willay.entity.Notificacion;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    /** Campana del encabezado: las más recientes, con filtro de tipo(s) opcional. */
    @Query("""
           select n from Notificacion n
           where n.usuario.id = :usuarioId
             and (:tipos is null or n.tipo in :tipos)
           order by n.creadoEn desc
           """)
    List<Notificacion> buscar(@Param("usuarioId") Long usuarioId, @Param("tipos") List<String> tipos, Pageable pageable);

    long countByUsuarioIdAndLeidaEnIsNull(Long usuarioId);

    boolean existsByIdAndUsuarioId(Long id, Long usuarioId);

    @Modifying
    @Query("update Notificacion n set n.leidaEn = :ahora where n.usuario.id = :usuarioId and n.leidaEn is null")
    void marcarTodasLeidas(Long usuarioId, OffsetDateTime ahora);

    /** Ownership ya verificado por separado (existsByIdAndUsuarioId): si ya estaba leída, no toca su leidaEn original. */
    @Modifying
    @Query("update Notificacion n set n.leidaEn = :ahora where n.id = :id and n.leidaEn is null")
    void marcarLeidaSiNoLoEstaba(@Param("id") Long id, @Param("ahora") OffsetDateTime ahora);
}
