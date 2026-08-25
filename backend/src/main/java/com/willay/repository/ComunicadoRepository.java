package com.willay.repository;

import com.willay.entity.Comunicado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComunicadoRepository extends JpaRepository<Comunicado, Long> {
    long countByColegioIdAndPublicadoEnIsNotNull(Long colegioId);
    boolean existsByColegioIdAndPublicadoEnIsNotNull(Long colegioId);
    List<Comunicado> findTop5ByColegioIdAndPublicadoEnIsNotNullOrderByPublicadoEnDesc(Long colegioId);

    List<Comunicado> findByColegioIdOrderByCreadoEnDesc(Long colegioId);

    List<Comunicado> findByColegioIdAndPublicadoEnIsNotNullOrderByPublicadoEnDesc(Long colegioId);
}
