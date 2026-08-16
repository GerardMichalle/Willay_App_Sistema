package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.CompletarActivacionRequest;
import com.willay.dto.IdentidadActivacionDto;
import com.willay.dto.VerificarActivacionRequest;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.repository.*;
import com.willay.security.IntentosAccesoService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Flujo "Activar mi cuenta": el código nace en la matrícula, es de un solo
 * uso y expira. El usuario nunca elige rol ni vínculos: se le muestran.
 */
@Service
@RequiredArgsConstructor
public class ActivacionService {

    private final CodigoActivacionRepository codigoRepository;
    private final AlumnoRepository alumnoRepository;
    private final ApoderadoRepository apoderadoRepository;
    private final AlumnoApoderadoRepository alumnoApoderadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoria;
    private final IntentosAccesoService intentosAcceso;

    @Transactional(readOnly = true)
    public IdentidadActivacionDto verificar(VerificarActivacionRequest peticion, String ip) {
        CodigoActivacion codigo = buscarVigente(peticion.codigo(), peticion.dni(), ip);
        Usuario usuario = codigo.getUsuario();
        return new IdentidadActivacionDto(
                usuario.nombreCompleto(),
                usuario.getRol().name(),
                describirVinculo(usuario));
    }

    @Transactional
    public IdentidadActivacionDto completar(CompletarActivacionRequest peticion, String ip) {
        CodigoActivacion codigo = buscarVigente(peticion.codigo(), peticion.dni(), ip);
        Usuario usuario = codigo.getUsuario();

        usuario.setClaveHash(passwordEncoder.encode(peticion.password()));
        usuario.setEstado(EstadoUsuario.ACTIVO);
        codigo.setUsadoEn(OffsetDateTime.now());

        auditoria.registrar(AccionAuditoria.CUENTA_ACTIVADA,
                usuario.getColegio() != null ? usuario.getColegio().getId() : null,
                usuario.getId(), null, ip);

        return new IdentidadActivacionDto(
                usuario.nombreCompleto(), usuario.getRol().name(), describirVinculo(usuario));
    }

    /**
     * Punto único de validación de código+DNI para verificar() y completar():
     * ambos atacan el mismo recurso, así que comparten la misma clave de
     * límite de intentos ("activacion:" + ip) — un fallo en cualquiera de
     * los dos cuenta para el mismo bloqueo.
     */
    private CodigoActivacion buscarVigente(String codigo, String dni, String ip) {
        String clave = "activacion:" + ip;
        intentosAcceso.verificarNoBloqueado(clave);

        Optional<CodigoActivacion> encontrado = codigoRepository.findByCodigoAndDni(codigo, dni)
                .filter(CodigoActivacion::vigente);

        if (encontrado.isEmpty()) {
            intentosAcceso.registrarFallo(clave);
            throw new BusinessException("Código o DNI incorrectos, o el código ya fue usado o expiró");
        }

        intentosAcceso.registrarExito(clave);
        return encontrado.get();
    }

    /** "Apoderado de Valeria Quispe · 5° \"A\"" / "Estudiante de 5° \"A\"". */
    private String describirVinculo(Usuario usuario) {
        if (usuario.getRol() == Rol.APODERADO) {
            return apoderadoRepository.findByUsuarioId(usuario.getId())
                    .map(ap -> alumnoApoderadoRepository.findByApoderadoId(ap.getId()).stream()
                            .findFirst()
                            .map(v -> {
                                Alumno hijo = v.getAlumno();
                                String aula = hijo.getAula() != null ? " · " + hijo.getAula().etiqueta() : "";
                                return "Apoderado de " + hijo.nombreCompleto() + aula;
                            })
                            .orElse("Apoderado"))
                    .orElse("Apoderado");
        }
        if (usuario.getRol() == Rol.ALUMNO) {
            return alumnoRepository.findByUsuarioId(usuario.getId())
                    .map(al -> al.getAula() != null
                            ? "Estudiante de " + al.getAula().etiqueta()
                            : "Estudiante")
                    .orElse("Estudiante");
        }
        return usuario.getRol().name();
    }
}
