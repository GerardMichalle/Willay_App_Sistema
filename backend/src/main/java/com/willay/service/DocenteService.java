package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.DocenteDto;
import com.willay.dto.GuardarDocenteRequest;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Gestión de docentes.
 *
 * Al dar de alta a un docente NO se le asigna una contraseña: se crea su
 * usuario en estado PENDIENTE y se emite un código de activación. El
 * docente establece su propia contraseña la primera vez que entra, igual
 * que alumnos y apoderados. Nadie más conoce jamás su clave.
 */
@Service
@RequiredArgsConstructor
public class DocenteService {

    private final DocenteRepository docenteRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final UsuarioRepository usuarioRepository;
    private final AulaRepository aulaRepository;
    private final ColegioRepository colegioRepository;
    private final CodigoActivacionRepository codigoRepository;
    private final CodigoActivacionService codigoActivacionService;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<DocenteDto> listar(Long colegioId) {
        return docenteRepository.findByColegioIdOrderByIdAsc(colegioId).stream()
                .map(this::aDto)
                .toList();
    }

    @Transactional
    public DocenteDto crear(Long colegioId, Long autorId, GuardarDocenteRequest req, String ip) {
        String correo = req.correo().trim().toLowerCase();
        if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correo);
        }

        Usuario usuario = new Usuario();
        usuario.setColegio(colegioRepository.getReferenceById(colegioId));
        usuario.setCorreo(correo);
        usuario.setRol(Rol.DOCENTE);
        usuario.setNombres(req.nombres().trim());
        usuario.setApellidos(req.apellidos().trim());
        usuario.setDni(vacioANulo(req.dni()));
        usuario.setTelefono(vacioANulo(req.telefono()));
        usuario.setEstado(EstadoUsuario.PENDIENTE);   // activará su cuenta con el código
        usuarioRepository.save(usuario);

        Docente docente = new Docente();
        docente.setColegio(usuario.getColegio());
        docente.setUsuario(usuario);
        docente.setEspecialidad(vacioANulo(req.especialidad()));
        docente.setEstado("ACTIVO");
        docenteRepository.save(docente);

        sincronizarAulas(colegioId, docente, req);

        if (usuario.getDni() != null) {
            codigoActivacionService.emitir(usuario, usuario.getDni());
        }

        auditoria.registrar(AccionAuditoria.DOCENTE_CREADO, colegioId, autorId,
                usuario.nombreCompleto(), ip);
        return aDto(docente);
    }

    @Transactional
    public DocenteDto actualizar(Long colegioId, Long autorId, Long id, GuardarDocenteRequest req, String ip) {
        Docente docente = docenteRepository.findById(id)
                .filter(d -> d.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Docente no encontrado"));

        Usuario usuario = docente.getUsuario();
        String correo = req.correo().trim().toLowerCase();
        if (!usuario.getCorreo().equalsIgnoreCase(correo)
                && usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correo);
        }

        usuario.setCorreo(correo);
        usuario.setNombres(req.nombres().trim());
        usuario.setApellidos(req.apellidos().trim());
        usuario.setDni(vacioANulo(req.dni()));
        usuario.setTelefono(vacioANulo(req.telefono()));
        docente.setEspecialidad(vacioANulo(req.especialidad()));

        sincronizarAulas(colegioId, docente, req);

        auditoria.registrar(AccionAuditoria.DOCENTE_ACTUALIZADO, colegioId, autorId,
                usuario.nombreCompleto(), ip);
        return aDto(docente);
    }

    /** Baja lógica: el docente conserva su historial de notas y conducta. */
    @Transactional
    public void cesar(Long colegioId, Long autorId, Long id, String ip) {
        Docente docente = docenteRepository.findById(id)
                .filter(d -> d.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Docente no encontrado"));

        docente.setEstado("CESADO");
        docente.getUsuario().setEstado(EstadoUsuario.SUSPENDIDO);   // pierde el acceso
        docenteAulaRepository.deleteAll(docenteAulaRepository.findByDocenteId(docente.getId()));

        auditoria.registrar(AccionAuditoria.DOCENTE_CESADO, colegioId, autorId,
                docente.getUsuario().nombreCompleto(), ip);
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private void sincronizarAulas(Long colegioId, Docente docente, GuardarDocenteRequest req) {
        docenteAulaRepository.deleteAll(docenteAulaRepository.findByDocenteId(docente.getId()));
        if (req.aulaIds() == null) return;

        for (Long aulaId : req.aulaIds()) {
            Aula aula = aulaRepository.findByIdAndColegioId(aulaId, colegioId)
                    .orElseThrow(() -> new NotFoundException("El aula " + aulaId + " no existe en este colegio"));
            DocenteAula da = new DocenteAula();
            da.setColegioId(colegioId);
            da.setDocente(docente);
            da.setAula(aula);
            da.setEsTutor(aulaId.equals(req.aulaTutoriaId()));
            docenteAulaRepository.save(da);
        }
    }

    private DocenteDto aDto(Docente d) {
        Usuario u = d.getUsuario();
        List<DocenteDto.AulaResumen> aulas = new ArrayList<>();
        for (DocenteAula da : docenteAulaRepository.findByDocenteId(d.getId())) {
            aulas.add(new DocenteDto.AulaResumen(da.getAula().getId(), da.getAula().etiqueta(), da.isEsTutor()));
        }
        // El código solo se expone mientras la cuenta siga pendiente de activación
        String codigo = u.getEstado() == EstadoUsuario.PENDIENTE
                ? codigoRepository.findByUsuarioIdAndUsadoEnIsNull(u.getId()).stream()
                    .findFirst().map(CodigoActivacion::getCodigo).orElse(null)
                : null;

        return new DocenteDto(d.getId(), u.getId(), u.getNombres(), u.getApellidos(),
                u.getCorreo(), u.getDni(), u.getTelefono(), d.getEspecialidad(),
                d.getEstado(), u.getEstado().name(), codigo, aulas);
    }

    private String vacioANulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
