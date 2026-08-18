package com.willay.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = extraerToken(request);
        if (token != null) {
            try {
                String correo = jwtService.validar(token).getSubject();
                if (correo != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UserDetails detalles = userDetailsService.loadUserByUsername(correo);
                    var auth = new UsernamePasswordAuthenticationToken(
                            detalles, null, detalles.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException ignorada) {
                // Token inválido o expirado: la petición sigue sin autenticar
                // y las reglas de SecurityConfig la rechazarán si la ruta es protegida.
            }
        }
        chain.doFilter(request, response);
    }

    /**
     * El token viaja en la cabecera Authorization salvo en los canales SSE
     * (/stream y /stream/vincular): la API EventSource del navegador no
     * permite enviar cabeceras, por lo que ahí se acepta por parámetro de
     * consulta.
     */
    private String extraerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        String uri = request.getRequestURI();
        if (uri.endsWith("/api/asistencia/stream") || uri.endsWith("/api/asistencia/stream/vincular")) {
            String porParametro = request.getParameter("token");
            if (porParametro != null && !porParametro.isBlank()) return porParametro;
        }
        return null;
    }
}
