package com.willay.repository;

import com.willay.entity.CodigoRecuperacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CodigoRecuperacionRepository extends JpaRepository<CodigoRecuperacion, Long> {

    Optional<CodigoRecuperacion> findByUsuarioIdAndCodigo(Long usuarioId, String codigo);

    List<CodigoRecuperacion> findByUsuarioIdAndUsadoEnIsNull(Long usuarioId);
}
