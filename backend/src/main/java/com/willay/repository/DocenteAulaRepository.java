package com.willay.repository;

import com.willay.entity.DocenteAula;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocenteAulaRepository extends JpaRepository<DocenteAula, Long> {

    /** Aulas asignadas a un docente: base del filtro "solo mi aula". */
    @Query("select da.aula.id from DocenteAula da where da.docente.usuario.id = :usuarioId")
    List<Long> aulasDelUsuarioDocente(@Param("usuarioId") Long usuarioId);

    /** Aulas donde el docente es tutor (no solo asignado): quien puede publicar la libreta. */
    @Query("select da.aula.id from DocenteAula da where da.docente.usuario.id = :usuarioId and da.esTutor = true")
    List<Long> aulasDondeEsTutor(@Param("usuarioId") Long usuarioId);

    List<DocenteAula> findByAulaId(Long aulaId);

    List<DocenteAula> findByDocenteId(Long docenteId);
}
