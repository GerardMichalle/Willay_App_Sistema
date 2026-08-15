package com.willay.repository;

import com.willay.entity.Rol;
import com.willay.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

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

    java.util.List<Usuario> findByColegioIdOrderByApellidosAsc(Long colegioId);
}
