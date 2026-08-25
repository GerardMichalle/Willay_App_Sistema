package com.willay.repository;

import com.willay.entity.ComunicadoGlobal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ComunicadoGlobalRepository extends JpaRepository<ComunicadoGlobal, Long> {

    @Query("""
           select c from ComunicadoGlobal c
           join fetch c.autor
           order by c.creadoEn desc
           """)
    List<ComunicadoGlobal> listarTodos();
}
