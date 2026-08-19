package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.entity.CodigoRecuperacion;
import com.willay.entity.EstadoUsuario;
import com.willay.entity.Usuario;
import com.willay.exception.BusinessException;
import com.willay.repository.CodigoRecuperacionRepository;
import com.willay.repository.RefreshTokenRepository;
import com.willay.repository.UsuarioRepository;
import com.willay.security.IntentosAccesoService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * "Olvidé mi contraseña": igual de estricta que la activación (código de un
 * solo uso, vencimiento corto), pero sin revelar nunca si un correo existe
 * en el sistema — eso evita que alguien use este formulario para averiguar
 * qué correos están registrados.
 */
@Service
@RequiredArgsConstructor
public class RecuperacionService {

    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final CodigoRecuperacionRepository codigoRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CorreoService correoService;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoria;
    private final IntentosAccesoService intentosAcceso;

    @Value("${willay.recuperacion.minutos-vigencia:30}")
    private int minutosVigencia;

    @Transactional
    public void solicitar(String correo, String ip) {
        intentosAcceso.verificarNoBloqueado("recuperar:" + ip);

        // Silencioso a propósito: ni el "éxito" ni el "no existe" se distinguen
        // desde afuera. Solo si el correo es real y tiene cuenta activa se envía algo.
        usuarioRepository.findByCorreoIgnoreCase(correo)
                .filter(u -> u.getEstado() == EstadoUsuario.ACTIVO)
                .ifPresent(this::emitirYEnviar);

        intentosAcceso.registrarExito("recuperar:" + ip);
    }

    @Transactional
    public void completar(String correo, String codigo, String passwordNueva, String ip) {
        String clave = "recuperar:" + ip;
        intentosAcceso.verificarNoBloqueado(clave);

        Optional<Usuario> quizasUsuario = usuarioRepository.findByCorreoIgnoreCase(correo);
        Optional<CodigoRecuperacion> encontrado = quizasUsuario
                .flatMap(u -> codigoRepository.findByUsuarioIdAndCodigo(u.getId(), codigo))
                .filter(CodigoRecuperacion::vigente);

        if (encontrado.isEmpty()) {
            intentosAcceso.registrarFallo(clave);
            throw new BusinessException("Código o correo incorrectos, o el código ya fue usado o expiró");
        }

        CodigoRecuperacion c = encontrado.get();
        Usuario usuario = quizasUsuario.get();
        usuario.setClaveHash(passwordEncoder.encode(passwordNueva));
        c.setUsadoEn(OffsetDateTime.now());
        refreshTokenRepository.revocarTodosDelUsuario(usuario.getId(), OffsetDateTime.now());

        intentosAcceso.registrarExito(clave);
        Long colegioId = usuario.getColegio() != null ? usuario.getColegio().getId() : null;
        auditoria.registrar(AccionAuditoria.PASSWORD_RECUPERADA, colegioId, usuario.getId(), null, ip);
    }

    private void emitirYEnviar(Usuario usuario) {
        codigoRepository.findByUsuarioIdAndUsadoEnIsNull(usuario.getId())
                .forEach(c -> c.setUsadoEn(OffsetDateTime.now()));

        CodigoRecuperacion c = new CodigoRecuperacion();
        c.setUsuario(usuario);
        c.setCodigo(String.format("%06d", ALEATORIO.nextInt(1_000_000)));
        c.setExpiraEn(OffsetDateTime.now().plusMinutes(minutosVigencia));
        codigoRepository.save(c);

        correoService.enviarCodigoRecuperacion(usuario, c.getCodigo(), minutosVigencia);
    }
}
