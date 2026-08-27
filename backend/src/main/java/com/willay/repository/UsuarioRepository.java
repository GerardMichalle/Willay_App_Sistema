package com.willay.repository;

import com.willay.entity.EstadoUsuario;
import com.willay.entity.Rol;
import com.willay.entity.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /** El correo es único en toda la plataforma (índice uq_usuario_correo_global). */
    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    boolean existsByCorreoIgnoreCase(String correo);

    /** Conteos del dashboard: siempre acotados al colegio del token. */
    long countByColegioIdAndRol(Long colegioId, Rol rol);

    long countByColegioIdAndRolAndEstado(Long colegioId, Rol rol, com.willay.entity.EstadoUsuario estado);

    long countByColegioIdAndEstado(Long colegioId, com.willay.entity.EstadoUsuario estado);

    java.util.List<Usuario> findByColegioIdAndRolInAndEstado(
            Long colegioId, java.util.Collection<Rol> roles, com.willay.entity.EstadoUsuario estado);

    /** Para el comunicado global del proveedor: solo administradores de colegios activos. */
    java.util.List<Usuario> findByRolAndColegio_ActivoTrue(Rol rol);

    /** Pantalla "Usuarios" del admin: todas las cuentas del colegio, con búsqueda y filtro de estado opcionales. */
    @Query("""
           select u from Usuario u
           where u.colegio.id = :colegioId
             and (:q = '' or lower(concat(u.nombres, ' ', u.apellidos, ' ', u.correo)) like lower(concat('%', :q, '%')))
             and (:estado is null or u.estado = :estado)
           order by u.apellidos asc, u.nombres asc
           """)
    Page<Usuario> buscarCuentas(@Param("colegioId") Long colegioId, @Param("q") String q,
                                 @Param("estado") EstadoUsuario estado, Pageable pageable);
}
