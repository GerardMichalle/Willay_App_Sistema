package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.ColegioDto;
import com.willay.dto.CrearColegioRequest;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Administración de instituciones cliente (solo SUPER_ADMIN).
 *
 * Este servicio es el que hace posible el modelo SaaS: vender a un colegio
 * nuevo no requiere desplegar nada, solo crear su registro. Todos comparten
 * la misma instancia y sus datos quedan aislados por colegio_id.
 */
@Service
@RequiredArgsConstructor
public class ColegioService {

    private final ColegioRepository colegioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlumnoRepository alumnoRepository;
    private final DocenteRepository docenteRepository;
    private final ApoderadoRepository apoderadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<ColegioDto> listar() {
        return colegioRepository.findAll().stream().map(this::aDto).toList();
    }

    @Transactional
    public ColegioDto crear(Long autorId, CrearColegioRequest req, String ip) {
        String correo = req.adminCorreo().trim().toLowerCase();
        if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correo);
        }

        Colegio colegio = new Colegio();
        colegio.setNombre(req.nombre().trim());
        colegio.setCodigoModular(nulo(req.codigoModular()));
        colegio.setRuc(nulo(req.ruc()));
        colegio.setColorMarca(req.colorMarca() == null || req.colorMarca().isBlank()
                ? "#E02D2D" : req.colorMarca());
        colegio.setActivo(true);
        colegioRepository.save(colegio);

        Sede sede = new Sede();
        sede.setColegio(colegio);
        sede.setNombre(req.sedeNombre().trim());
        sede.setDireccion(nulo(req.sedeDireccion()));
        sede.setActivo(true);
        sedeRepository.save(sede);

        // Cuenta de administración: contraseña temporal que deberá cambiar
        Usuario admin = new Usuario();
        admin.setColegio(colegio);
        admin.setCorreo(correo);
        admin.setClaveHash(passwordEncoder.encode(req.adminPasswordTemporal()));
        admin.setRol(Rol.ADMIN);
        admin.setNombres(req.adminNombres().trim());
        admin.setApellidos(req.adminApellidos().trim());
        admin.setDni(nulo(req.adminDni()));
        admin.setTelefono(nulo(req.adminTelefono()));
        admin.setEstado(EstadoUsuario.ACTIVO);
        usuarioRepository.save(admin);

        auditoria.registrar(AccionAuditoria.COLEGIO_CREADO, colegio.getId(), autorId,
                colegio.getNombre() + " · admin " + correo, ip);
        return aDto(colegio);
    }

    /**
     * Suspende o reactiva un colegio.
     * Un colegio suspendido (por impago, por ejemplo) conserva TODOS sus
     * datos; solo se bloquea el acceso de sus usuarios.
     */
    @Transactional
    public ColegioDto cambiarEstado(Long autorId, Long id, boolean activo, String ip) {
        Colegio colegio = colegioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));
        colegio.setActivo(activo);

        auditoria.registrar(AccionAuditoria.COLEGIO_ESTADO_CAMBIADO, id, autorId,
                colegio.getNombre() + " → " + (activo ? "ACTIVO" : "SUSPENDIDO"), ip);
        return aDto(colegio);
    }

    private ColegioDto aDto(Colegio c) {
        return new ColegioDto(
                c.getId(), c.getNombre(), c.getCodigoModular(), c.getRuc(), c.getColorMarca(),
                c.isActivo(),
                alumnoRepository.countByColegioIdAndEstado(c.getId(), "MATRICULADO"),
                docenteRepository.countByColegioId(c.getId()),
                apoderadoRepository.countByColegioId(c.getId()),
                usuarioRepository.countByColegioIdAndEstado(c.getId(), EstadoUsuario.ACTIVO),
                c.getCreadoEn());
    }

    private String nulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
