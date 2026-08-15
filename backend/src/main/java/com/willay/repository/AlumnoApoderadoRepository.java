package com.willay.repository;

import com.willay.entity.AlumnoApoderado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlumnoApoderadoRepository extends JpaRepository<AlumnoApoderado, Long> {
    List<AlumnoApoderado> findByApoderadoId(Long apoderadoId);
    List<AlumnoApoderado> findByAlumnoId(Long alumnoId);
}
