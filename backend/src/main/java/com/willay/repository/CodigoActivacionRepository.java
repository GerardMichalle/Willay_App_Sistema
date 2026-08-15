package com.willay.repository;

import com.willay.entity.CodigoActivacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CodigoActivacionRepository extends JpaRepository<CodigoActivacion, Long> {

    Optional<CodigoActivacion> findByCodigoAndDni(String codigo, String dni);

    List<CodigoActivacion> findByUsuarioIdAndUsadoEnIsNull(Long usuarioId);

    boolean existsByColegioIdAndCodigoAndUsadoEnIsNull(Long colegioId, String codigo);
}
