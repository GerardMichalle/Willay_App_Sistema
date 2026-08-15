package com.willay.repository;

import com.willay.entity.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    List<Notificacion> findTop30ByUsuarioIdOrderByCreadoEnDesc(Long usuarioId);

    long countByUsuarioIdAndLeidaEnIsNull(Long usuarioId);

    @Modifying
    @Query("update Notificacion n set n.leidaEn = :ahora where n.usuario.id = :usuarioId and n.leidaEn is null")
    void marcarTodasLeidas(Long usuarioId, OffsetDateTime ahora);
}
