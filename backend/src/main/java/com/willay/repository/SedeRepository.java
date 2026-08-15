package com.willay.repository;

import com.willay.entity.Sede;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SedeRepository extends JpaRepository<Sede, Long> {
    List<Sede> findByColegioIdAndActivoTrue(Long colegioId);
    Optional<Sede> findFirstByColegioIdAndActivoTrue(Long colegioId);
}
