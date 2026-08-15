package com.willay.repository;

import com.willay.entity.Colegio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ColegioRepository extends JpaRepository<Colegio, Long> {
    List<Colegio> findByActivoTrueOrderByNombreAsc();
}
