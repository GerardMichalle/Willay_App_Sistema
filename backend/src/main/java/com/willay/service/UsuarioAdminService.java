package com.willay.service;

import com.willay.dto.UsuarioAdminDto;
import com.willay.entity.CodigoActivacion;
import com.willay.entity.EstadoUsuario;
import com.willay.entity.Rol;
import com.willay.entity.Usuario;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.CodigoActivacionRepository;
import com.willay.repository.UsuarioRepository;
import com.willay.util.ZonaHoraria;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Gestión de cuentas por parte del administrador del colegio.
 * Permite suspender o reactivar accesos y reemitir códigos de activación
 * cuando una familia pierde el suyo, sin exponer nunca una contraseña.
 */
@Service
@RequiredArgsConstructor
public class UsuarioAdminService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    private final UsuarioRepository usuarioRepository;
    private final CodigoActivacionRepository codigoRepository;
    private final CodigoActivacionService codigoActivacionService;

    @Transactional(readOnly = true)
    public List<UsuarioAdminDto> listar(Long colegioId) {
        return usuarioRepository.findByColegioIdOrderByApellidosAsc(colegioId)
                .stream().map(this::aDto).toList();
    }

    @Transactional
    public UsuarioAdminDto cambiarEstado(Long colegioId, Long id, boolean activo, Long autorId) {
        Usuario u = buscar(colegioId, id);
        if (u.getId().equals(autorId)) {
            throw new BusinessException("No puedes suspender tu propia cuenta");
        }
        if (u.getRol() == Rol.ADMIN && !activo) {
            long admins = usuarioRepository.countByColegioIdAndRolAndEstado(colegioId, Rol.ADMIN, EstadoUsuario.ACTIVO);
            if (admins <= 1) throw new BusinessException("El colegio debe conservar al menos un administrador activo");
        }
        u.setEstado(activo ? EstadoUsuario.ACTIVO : EstadoUsuario.SUSPENDIDO);
        return aDto(u);
    }

    /** Reemite el código de activación de una cuenta pendiente. */
    @Transactional
    public UsuarioAdminDto reenviarCodigo(Long colegioId, Long id) {
        Usuario u = buscar(colegioId, id);
        if (u.getEstado() == EstadoUsuario.ACTIVO) {
            throw new BusinessException("La cuenta ya está activada; use la recuperación de contraseña");
        }
        if (u.getDni() == null || u.getDni().isBlank()) {
            throw new BusinessException("La cuenta no tiene DNI registrado: no se puede emitir el código");
        }
        codigoActivacionService.emitir(u, u.getDni());
        return aDto(u);
    }

    private Usuario buscar(Long colegioId, Long id) {
        return usuarioRepository.findById(id)
                .filter(u -> u.getColegio() != null && u.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }

    private UsuarioAdminDto aDto(Usuario u) {
        String codigo = u.getEstado() == EstadoUsuario.PENDIENTE
                ? codigoRepository.findByUsuarioIdAndUsadoEnIsNull(u.getId()).stream()
                    .findFirst().map(CodigoActivacion::getCodigo).orElse(null)
                : null;
        return new UsuarioAdminDto(u.getId(), u.getNombres(), u.getApellidos(), u.getCorreo(),
                u.getRol().name(), u.getEstado().name(), u.getDni(), u.getTelefono(),
                u.getUltimoAcceso() != null ? u.getUltimoAcceso().atZoneSameInstant(ZonaHoraria.LIMA).format(FECHA) : null, codigo);
    }
}
