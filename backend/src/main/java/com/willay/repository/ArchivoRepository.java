package com.willay.repository;

import com.willay.entity.Archivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ArchivoRepository extends JpaRepository<Archivo, Long> {
    Optional<Archivo> findByUuid(UUID uuid);
}
