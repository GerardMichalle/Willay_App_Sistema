package com.willay.repository;

import com.willay.entity.Alumno;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlumnoRepository extends JpaRepository<Alumno, Long> {

    long countByColegioId(Long colegioId);

    long countByColegioIdAndEstado(Long colegioId, String estado);

    List<Alumno> findByColegioIdOrderByApellidosAsc(Long colegioId);

    List<Alumno> findByAulaIdOrderByApellidosAsc(Long aulaId);

    Optional<Alumno> findByColegioIdAndCodigo(Long colegioId, String codigo);

    Optional<Alumno> findByIdAndColegioId(Long id, Long colegioId);

    Optional<Alumno> findByUsuarioId(Long usuarioId);

    boolean existsByColegioIdAndDni(Long colegioId, String dni);

    /**
     * Listado del colegio completo (ADMIN y DIRECCIÓN).
     *
     * El término de búsqueda NUNCA llega como null: se envía cadena vacía.
     * PostgreSQL no puede inferir el tipo de un parámetro nulo y lo trata
     * como binario, lo que hace fallar lower(). Con cadena vacía el tipo
     * queda determinado y la condición se cumple siempre.
     */
    @Query("""
           select a from Alumno a
           where a.colegio.id = :colegioId
             and (:q = '' or lower(concat(a.nombres, ' ', a.apellidos)) like lower(concat('%', :q, '%'))
                          or lower(a.codigo) like lower(concat('%', :q, '%')))
           order by a.apellidos asc, a.nombres asc
           """)
    Page<Alumno> buscar(@Param("colegioId") Long colegioId,
                        @Param("q") String q,
                        Pageable pageable);

    /** Listado acotado a las aulas asignadas (DOCENTE). Ver nota en buscar(). */
    @Query("""
           select a from Alumno a
           where a.colegio.id = :colegioId
             and a.aula.id in :aulas
             and (:q = '' or lower(concat(a.nombres, ' ', a.apellidos)) like lower(concat('%', :q, '%'))
                          or lower(a.codigo) like lower(concat('%', :q, '%')))
           order by a.apellidos asc, a.nombres asc
           """)
    Page<Alumno> buscarEnAulas(@Param("colegioId") Long colegioId,
                               @Param("aulas") Collection<Long> aulas,
                               @Param("q") String q,
                               Pageable pageable);

    /** Hijos vinculados a un apoderado (APODERADO). */
    @Query("""
           select aa.alumno from AlumnoApoderado aa
           where aa.apoderado.usuario.id = :usuarioId
           order by aa.alumno.apellidos asc
           """)
    List<Alumno> hijosDelApoderado(@Param("usuarioId") Long usuarioId);

    /** Conteo de alumnos por aula en una sola consulta (evita N+1). */
    @Query("""
           select a.aula.id, count(a) from Alumno a
           where a.colegio.id = :colegioId and a.estado = 'MATRICULADO' and a.aula is not null
           group by a.aula.id
           """)
    List<Object[]> contarPorAula(@Param("colegioId") Long colegioId);

    /** Último correlativo del colegio para autogenerar el código A-XXXX. */
    @Query("select max(cast(substring(a.codigo, 3) as integer)) from Alumno a where a.colegio.id = :colegioId")
    Integer ultimoCorrelativo(@Param("colegioId") Long colegioId);
}
