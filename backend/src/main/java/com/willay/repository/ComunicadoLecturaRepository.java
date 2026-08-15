package com.willay.repository;

import com.willay.entity.ComunicadoLectura;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComunicadoLecturaRepository extends JpaRepository<ComunicadoLectura, Long> {
    boolean existsByComunicadoIdAndUsuarioId(Long comunicadoId, Long usuarioId);
    long countByComunicadoId(Long comunicadoId);
}
