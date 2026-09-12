package com.willay.repository;

import com.willay.entity.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {

    List<FcmToken> findByUsuarioId(Long usuarioId);

    Optional<FcmToken> findByToken(String token);

    void deleteByUsuarioIdAndToken(Long usuarioId, String token);
}
