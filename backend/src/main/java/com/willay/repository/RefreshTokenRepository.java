package com.willay.repository;

import com.willay.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(UUID token);

    @Modifying
    @Query("update RefreshToken r set r.revocadoEn = :ahora where r.usuario.id = :usuarioId and r.revocadoEn is null")
    void revocarTodosDelUsuario(Long usuarioId, OffsetDateTime ahora);
}
