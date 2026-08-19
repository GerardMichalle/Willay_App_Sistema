package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.ApoderadoDto;
import com.willay.dto.CuentaCreadaDto;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ApoderadoService {

    private final ApoderadoRepository apoderadoRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final CodigoActivacionRepository codigoRepository;
    private final UsuarioRepository usuarioRepository;
    private final CodigoActivacionService codigoActivacionService;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<ApoderadoDto> listar(Long colegioId) {
        return apoderadoRepository.findByColegioIdOrderByApellidosAsc(colegioId).stream()
                .map(this::aDto)
                .toList();
    }

    /**
     * Crea la cuenta web de un apoderado ya vinculado a un alumno pero sin
     * cuenta (típicamente: no se dio su correo durante la matrícula).
     */
    @Transactional
    public CuentaCreadaDto crearCuenta(UsuarioPrincipal quien, Long id, String correo, String ip) {
        Long colegioId = quien.getColegioId();
        Apoderado apoderado = apoderadoRepository.findByIdAndColegioId(id, colegioId)
                .orElseThrow(() -> new NotFoundException("Apoderado no encontrado"));

        if (apoderado.getUsuario() != null) {
            throw new BusinessException("Este apoderado ya tiene una cuenta web");
        }

        String correoLimpio = correo.trim().toLowerCase();
        if (usuarioRepository.existsByCorreoIgnoreCase(correoLimpio)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correoLimpio);
        }

        Usuario cuenta = new Usuario();
        cuenta.setColegio(apoderado.getColegio());
        cuenta.setCorreo(correoLimpio);
        cuenta.setRol(Rol.APODERADO);
        cuenta.setNombres(apoderado.getNombres());
        cuenta.setApellidos(apoderado.getApellidos());
        cuenta.setDni(apoderado.getDni());
        cuenta.setEstado(EstadoUsuario.PENDIENTE);
        usuarioRepository.save(cuenta);
        apoderado.setUsuario(cuenta);
        apoderado.setCorreo(correoLimpio);

        String codigo = codigoActivacionService.emitir(cuenta, apoderado.getDni()).getCodigo();

        auditoria.registrar(AccionAuditoria.CUENTA_APODERADO_CREADA, colegioId, quien.getId(),
                apoderado.getNombres() + " " + apoderado.getApellidos(), ip);

        return new CuentaCreadaDto(codigo);
    }

    /**
     * Elimina un apoderado, pero solo si nunca llegó a activar su cuenta: un
     * apoderado ACTIVO ya tiene historial real (accesos, notificaciones) que
     * no se debe destruir. El o los alumnos vinculados no se tocan, solo
     * quedan sin ese apoderado.
     */
    @Transactional
    public void eliminar(UsuarioPrincipal quien, Long id, String ip) {
        Apoderado apoderado = apoderadoRepository.findByIdAndColegioId(id, quien.getColegioId())
                .orElseThrow(() -> new NotFoundException("Apoderado no encontrado"));

        if (apoderado.getUsuario() != null && apoderado.getUsuario().getEstado() == EstadoUsuario.ACTIVO) {
            throw new BusinessException(
                    "No se puede eliminar: ya activó su cuenta y tiene historial real. "
                    + "Solo se pueden eliminar apoderados sin cuenta o con cuenta aún sin activar.");
        }

        String nombre = apoderado.getNombres() + " " + apoderado.getApellidos();
        Usuario cuentaPendiente = apoderado.getUsuario();
        apoderadoRepository.delete(apoderado);
        if (cuentaPendiente != null) {
            usuarioRepository.delete(cuentaPendiente);
        }

        auditoria.registrar(AccionAuditoria.APODERADO_ELIMINADO, quien.getColegioId(), quien.getId(), nombre, ip);
    }

    private ApoderadoDto aDto(Apoderado ap) {
        List<ApoderadoDto.HijoResumen> hijos = new ArrayList<>();
        for (AlumnoApoderado v : vinculoRepository.findByApoderadoId(ap.getId())) {
            Alumno a = v.getAlumno();
            hijos.add(new ApoderadoDto.HijoResumen(a.getId(), a.getCodigo(), a.nombreCompleto(),
                    a.getAula() != null ? a.getAula().etiqueta() : "Sin aula", v.getParentesco()));
        }

        Usuario u = ap.getUsuario();
        String estado = u == null ? "SIN_CUENTA" : u.getEstado().name();
        // El código solo se muestra mientras la cuenta esté pendiente
        String codigo = (u != null && u.getEstado() == EstadoUsuario.PENDIENTE)
                ? codigoRepository.findByUsuarioIdAndUsadoEnIsNull(u.getId()).stream()
                    .findFirst().map(CodigoActivacion::getCodigo).orElse(null)
                : null;

        return new ApoderadoDto(ap.getId(), u != null ? u.getId() : null, ap.getNombres(), ap.getApellidos(), ap.getDni(),
                ap.getTelefono(), ap.getCorreo(), estado, codigo, u != null ? u.getFotoUrl() : null, hijos);
    }
}
