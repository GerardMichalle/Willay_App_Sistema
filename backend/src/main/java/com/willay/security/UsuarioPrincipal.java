package com.willay.security;

import com.willay.entity.EstadoUsuario;
import com.willay.entity.Rol;
import com.willay.entity.Usuario;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adaptador entre nuestro Usuario y Spring Security.
 * Transporta el colegioId y el rol para que TODA consulta posterior
 * se filtre por el colegio del token, nunca por parámetros del cliente.
 */
@Getter
public class UsuarioPrincipal implements UserDetails {

    private final Long id;
    private final Long colegioId;
    private final String correo;
    private final String claveHash;
    private final Rol rol;
    private final boolean activo;

    public UsuarioPrincipal(Usuario u) {
        this.id = u.getId();
        this.colegioId = u.getColegio() != null ? u.getColegio().getId() : null;
        this.correo = u.getCorreo();
        this.claveHash = u.getClaveHash();
        this.rol = u.getRol();
        // Un colegio suspendido bloquea a todos sus usuarios sin borrar nada
        boolean colegioHabilitado = u.getColegio() == null || u.getColegio().isActivo();
        this.activo = u.getEstado() == EstadoUsuario.ACTIVO && colegioHabilitado;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    @Override public String getPassword() { return claveHash; }
    @Override public String getUsername() { return correo; }
    @Override public boolean isEnabled() { return activo; }
    @Override public boolean isAccountNonLocked() { return activo; }
}
