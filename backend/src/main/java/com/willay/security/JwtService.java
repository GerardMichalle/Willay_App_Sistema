package com.willay.security;

import com.willay.entity.Rol;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

/**
 * Emisión y validación de JWT (HS256, jjwt 0.12).
 * El token lleva: sub = correo, uid, rol y colegioId.
 */
@Service
public class JwtService {

    private final SecretKey clave;
    private final Duration duracionAcceso;

    public JwtService(
            @Value("${willay.jwt.secreto}") String secreto,
            @Value("${willay.jwt.duracion-acceso-min:30}") long duracionMin) {
        this.clave = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.duracionAcceso = Duration.ofMinutes(duracionMin);
    }

    public String emitir(Long usuarioId, String correo, Rol rol, Long colegioId) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(correo)
                .claim("uid", usuarioId)
                .claim("rol", rol.name())
                .claim("colegioId", colegioId)
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + duracionAcceso.toMillis()))
                .signWith(clave)
                .compact();
    }

    /** @return claims si el token es válido; lanza JwtException si no. */
    public Claims validar(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(clave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** Token de vida corta para acceder a un archivo puntual sin sesión completa. */
    public String emitirTokenArchivo(UUID archivoUuid, int minutosVigencia) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject("archivo")
                .claim("archivoUuid", archivoUuid.toString())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + minutosVigencia * 60_000L))
                .signWith(clave)
                .compact();
    }

    /**
     * Valida un enlace firmado de archivo: firma correcta, no vencido, emitido
     * como token de archivo (no un token de sesión) y para este UUID exacto.
     */
    public boolean tokenArchivoValido(String token, UUID archivoUuid) {
        try {
            Claims claims = validar(token);
            return "archivo".equals(claims.getSubject())
                    && archivoUuid.toString().equals(claims.get("archivoUuid", String.class));
        } catch (JwtException e) {
            return false;
        }
    }
}
