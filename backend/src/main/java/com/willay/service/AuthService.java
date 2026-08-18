package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.CambiarPasswordRequest;
import com.willay.dto.LoginRequest;
import com.willay.dto.TokenResponse;
import com.willay.entity.RefreshToken;
import com.willay.entity.Usuario;
import com.willay.exception.BusinessException;
import com.willay.mapper.UsuarioMapper;
import com.willay.repository.RefreshTokenRepository;
import com.willay.repository.UsuarioRepository;
import com.willay.security.IntentosAccesoService;
import com.willay.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final UsuarioMapper usuarioMapper;
    private final AuditoriaService auditoria;
    private final IntentosAccesoService intentosAcceso;
    private final PasswordEncoder passwordEncoder;

    @Value("${willay.jwt.duracion-refresh-dias:14}")
    private long duracionRefreshDias;

    @Transactional
    public TokenResponse login(LoginRequest peticion, String ip) {
        intentosAcceso.verificarNoBloqueado(peticion.correo());
        intentosAcceso.verificarNoBloqueado(ip);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(peticion.correo(), peticion.password()));
        } catch (BadCredentialsException e) {
            intentosAcceso.registrarFallo(peticion.correo());
            intentosAcceso.registrarFallo(ip);
            auditoria.registrar(AccionAuditoria.LOGIN_FALLIDO, null, null, peticion.correo(), ip);
            throw e;
        }

        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(peticion.correo()).orElseThrow();
        usuario.setUltimoAcceso(OffsetDateTime.now());

        Long colegioId = usuario.getColegio() != null ? usuario.getColegio().getId() : null;
        String access = jwtService.emitir(
                usuario.getId(), usuario.getCorreo(), usuario.getRol(), colegioId);
        RefreshToken refresh = crearRefresh(usuario);

        intentosAcceso.registrarExito(peticion.correo());
        intentosAcceso.registrarExito(ip);

        auditoria.registrar(AccionAuditoria.LOGIN_OK, colegioId, usuario.getId(), null, ip);

        return new TokenResponse(access, refresh.getToken().toString(), usuarioMapper.aDto(usuario));
    }

    /** Rotación: el refresh usado se revoca y se emite uno nuevo. */
    @Transactional
    public TokenResponse refrescar(String refreshToken, String ip) {
        RefreshToken actual = refreshTokenRepository.findByToken(parseUuid(refreshToken))
                .filter(RefreshToken::vigente)
                .orElseThrow(() -> new BusinessException("Sesión expirada, vuelve a iniciar sesión"));

        actual.setRevocadoEn(OffsetDateTime.now());
        Usuario usuario = actual.getUsuario();

        Long colegioId = usuario.getColegio() != null ? usuario.getColegio().getId() : null;
        String access = jwtService.emitir(
                usuario.getId(), usuario.getCorreo(), usuario.getRol(), colegioId);
        RefreshToken nuevo = crearRefresh(usuario);

        auditoria.registrar(AccionAuditoria.TOKEN_REFRESCADO, colegioId, usuario.getId(), null, ip);

        return new TokenResponse(access, nuevo.getToken().toString(), usuarioMapper.aDto(usuario));
    }

    @Transactional
    public void logout(Long usuarioId, String ip) {
        refreshTokenRepository.revocarTodosDelUsuario(usuarioId, OffsetDateTime.now());
        auditoria.registrar(AccionAuditoria.LOGOUT, null, usuarioId, null, ip);
    }

    /**
     * Cambio de contraseña por el propio usuario, ya autenticado.
     * Revoca los refresh tokens existentes: cualquier otra sesión activa
     * tendrá que volver a loguearse con la contraseña nueva.
     */
    @Transactional
    public void cambiarPassword(Long usuarioId, CambiarPasswordRequest peticion, String ip) {
        if (peticion.passwordActual().equals(peticion.passwordNueva())) {
            throw new BusinessException("La nueva contraseña debe ser distinta a la actual");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        if (!passwordEncoder.matches(peticion.passwordActual(), usuario.getClaveHash())) {
            throw new BusinessException("La contraseña actual no es correcta");
        }

        usuario.setClaveHash(passwordEncoder.encode(peticion.passwordNueva()));
        refreshTokenRepository.revocarTodosDelUsuario(usuarioId, OffsetDateTime.now());

        Long colegioId = usuario.getColegio() != null ? usuario.getColegio().getId() : null;
        auditoria.registrar(AccionAuditoria.PASSWORD_CAMBIADA, colegioId, usuarioId, null, ip);
    }

    private RefreshToken crearRefresh(Usuario usuario) {
        RefreshToken r = new RefreshToken();
        r.setUsuario(usuario);
        r.setExpiraEn(OffsetDateTime.now().plusDays(duracionRefreshDias));
        return refreshTokenRepository.save(r);
    }

    private UUID parseUuid(String valor) {
        try {
            return UUID.fromString(valor);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Token de sesión inválido");
        }
    }
}
