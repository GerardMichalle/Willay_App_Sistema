package com.willay.repository;

import com.willay.entity.ConfiguracionColegio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConfiguracionRepository extends JpaRepository<ConfiguracionColegio, Long> {
    Optional<ConfiguracionColegio> findByColegioIdAndClave(Long colegioId, String clave);
    List<ConfiguracionColegio> findByColegioIdOrderByClaveAsc(Long colegioId);
}
