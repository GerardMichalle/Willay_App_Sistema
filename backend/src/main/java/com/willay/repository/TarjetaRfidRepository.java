package com.willay.repository;

import com.willay.entity.TarjetaRfid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TarjetaRfidRepository extends JpaRepository<TarjetaRfid, Long> {

    Optional<TarjetaRfid> findByAlumnoIdAndEstado(Long alumnoId, String estado);

    Optional<TarjetaRfid> findByColegioIdAndCodigoAndEstado(Long colegioId, String codigo, String estado);

    boolean existsByColegioIdAndCodigoAndEstado(Long colegioId, String codigo, String estado);

    List<TarjetaRfid> findByColegioIdAndEstado(Long colegioId, String estado);

    long countByColegioIdAndEstado(Long colegioId, String estado);
}
