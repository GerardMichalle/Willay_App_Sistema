package com.willay.util;

import com.willay.security.UsuarioPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Acceso tipado al usuario autenticado.
 * De aquí sale SIEMPRE el colegioId de las consultas: jamás del request.
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static UsuarioPrincipal get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UsuarioPrincipal p)) {
            throw new IllegalStateException("No hay usuario autenticado en el contexto");
        }
        return p;
    }

    public static Long colegioId() { return get().getColegioId(); }
    public static Long usuarioId() { return get().getId(); }
}
