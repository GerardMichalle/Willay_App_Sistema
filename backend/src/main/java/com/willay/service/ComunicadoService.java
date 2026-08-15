package com.willay.service;

import com.willay.dto.ComunicadoDto;
import com.willay.dto.GuardarComunicadoRequest;
import com.willay.entity.*;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Comunicados institucionales.
 *
 * Un comunicado puede dirigirse a todo el colegio o a un aula concreta, y
 * a un tipo de destinatario. El docente solo puede emitir hacia sus aulas.
 * Al publicarse se genera una notificación para cada destinatario, que es
 * lo que enciende la campana del encabezado.
 */
@Service
@RequiredArgsConstructor
public class ComunicadoService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final ComunicadoRepository comunicadoRepository;
    private final ComunicadoLecturaRepository lecturaRepository;
    private final NotificacionRepository notificacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AulaRepository aulaRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final AlumnoRepository alumnoRepository;
    private final ColegioRepository colegioRepository;

    @Transactional(readOnly = true)
    public List<ComunicadoDto> listar(UsuarioPrincipal quien) {
        Long colegioId = quien.getColegioId();

        List<Comunicado> todos = switch (quien.getRol()) {
            case ADMIN, DIRECCION -> comunicadoRepository.findByColegioIdOrderByCreadoEnDesc(colegioId);
            case DOCENTE -> {
                List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
                yield comunicadoRepository.findByColegioIdAndPublicadoEnIsNotNullOrderByPublicadoEnDesc(colegioId)
                        .stream()
                        .filter(c -> c.getAula() == null || aulas.contains(c.getAula().getId()))
                        .filter(c -> !"APODERADOS".equals(c.getDirigidoA()) && !"ALUMNOS".equals(c.getDirigidoA()))
                        .toList();
            }
            case APODERADO -> {
                List<Long> aulasHijos = alumnoRepository.hijosDelApoderado(quien.getId()).stream()
                        .filter(a -> a.getAula() != null)
                        .map(a -> a.getAula().getId()).toList();
                yield comunicadoRepository.findByColegioIdAndPublicadoEnIsNotNullOrderByPublicadoEnDesc(colegioId)
                        .stream()
                        .filter(c -> c.getAula() == null || aulasHijos.contains(c.getAula().getId()))
                        .filter(c -> !"DOCENTES".equals(c.getDirigidoA()) && !"ALUMNOS".equals(c.getDirigidoA()))
                        .toList();
            }
            case ALUMNO -> {
                Long aulaId = alumnoRepository.findByUsuarioId(quien.getId())
                        .map(a -> a.getAula() != null ? a.getAula().getId() : null).orElse(null);
                yield comunicadoRepository.findByColegioIdAndPublicadoEnIsNotNullOrderByPublicadoEnDesc(colegioId)
                        .stream()
                        .filter(c -> c.getAula() == null || c.getAula().getId().equals(aulaId))
                        .filter(c -> !"DOCENTES".equals(c.getDirigidoA()) && !"APODERADOS".equals(c.getDirigidoA()))
                        .toList();
            }
            default -> List.of();
        };

        return todos.stream().map(c -> aDto(c, quien.getId())).toList();
    }

    @Transactional
    public ComunicadoDto crear(UsuarioPrincipal quien, GuardarComunicadoRequest req) {
        Comunicado c = new Comunicado();
        c.setColegio(colegioRepository.getReferenceById(quien.getColegioId()));
        c.setAutor(usuarioRepository.getReferenceById(quien.getId()));
        aplicar(c, req, quien);
        comunicadoRepository.save(c);

        if (req.publicar()) publicarInterno(c, quien);
        return aDto(c, quien.getId());
    }

    @Transactional
    public ComunicadoDto actualizar(UsuarioPrincipal quien, Long id, GuardarComunicadoRequest req) {
        Comunicado c = buscar(quien.getColegioId(), id);
        aplicar(c, req, quien);
        if (req.publicar() && c.getPublicadoEn() == null) publicarInterno(c, quien);
        return aDto(c, quien.getId());
    }

    @Transactional
    public ComunicadoDto publicar(UsuarioPrincipal quien, Long id) {
        Comunicado c = buscar(quien.getColegioId(), id);
        if (c.getPublicadoEn() == null) publicarInterno(c, quien);
        return aDto(c, quien.getId());
    }

    @Transactional
    public void eliminar(Long colegioId, Long id) {
        comunicadoRepository.delete(buscar(colegioId, id));
    }

    @Transactional
    public void marcarLeido(Long usuarioId, Long comunicadoId) {
        if (lecturaRepository.existsByComunicadoIdAndUsuarioId(comunicadoId, usuarioId)) return;
        ComunicadoLectura l = new ComunicadoLectura();
        l.setComunicado(comunicadoRepository.getReferenceById(comunicadoId));
        l.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        lecturaRepository.save(l);
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private void aplicar(Comunicado c, GuardarComunicadoRequest req, UsuarioPrincipal quien) {
        c.setTitulo(req.titulo().trim());
        c.setCuerpo(req.cuerpo().trim());
        c.setDirigidoA(req.dirigidoA() == null || req.dirigidoA().isBlank() ? "TODOS" : req.dirigidoA());

        if (req.aulaId() != null) {
            Aula aula = aulaRepository.findByIdAndColegioId(req.aulaId(), quien.getColegioId())
                    .orElseThrow(() -> new NotFoundException("El aula indicada no existe"));
            // Un docente no puede emitir hacia aulas que no le corresponden
            if (quien.getRol() == Rol.DOCENTE
                    && !docenteAulaRepository.aulasDelUsuarioDocente(quien.getId()).contains(aula.getId())) {
                throw new NotFoundException("El aula indicada no existe");
            }
            c.setAula(aula);
        } else {
            c.setAula(null);
        }
    }

    /** Publica y notifica a los destinatarios correspondientes. */
    private void publicarInterno(Comunicado c, UsuarioPrincipal quien) {
        c.setPublicadoEn(OffsetDateTime.now());

        List<Usuario> destinatarios = destinatarios(c, quien.getColegioId());
        for (Usuario u : destinatarios) {
            if (u.getId().equals(quien.getId())) continue;   // no se notifica al autor
            Notificacion n = new Notificacion();
            n.setColegio(c.getColegio());
            n.setUsuario(u);
            n.setTipo("COMUNICADO");
            n.setTitulo(c.getTitulo());
            n.setCuerpo(c.getCuerpo().length() > 160 ? c.getCuerpo().substring(0, 157) + "…" : c.getCuerpo());
            n.setCanal("APP");
            n.setEnviadaEn(OffsetDateTime.now());
            notificacionRepository.save(n);
        }
    }

    private List<Usuario> destinatarios(Comunicado c, Long colegioId) {
        List<Rol> roles = switch (c.getDirigidoA()) {
            case "APODERADOS" -> List.of(Rol.APODERADO);
            case "DOCENTES" -> List.of(Rol.DOCENTE);
            case "ALUMNOS" -> List.of(Rol.ALUMNO);
            default -> List.of(Rol.APODERADO, Rol.DOCENTE, Rol.ALUMNO, Rol.DIRECCION);
        };
        return usuarioRepository.findByColegioIdAndRolInAndEstado(colegioId, roles, EstadoUsuario.ACTIVO);
    }

    private Comunicado buscar(Long colegioId, Long id) {
        return comunicadoRepository.findById(id)
                .filter(c -> c.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Comunicado no encontrado"));
    }

    private ComunicadoDto aDto(Comunicado c, Long usuarioId) {
        long lecturas = lecturaRepository.countByComunicadoId(c.getId());
        long destinatarios = destinatarios(c, c.getColegio().getId()).size();
        return new ComunicadoDto(
                c.getId(), c.getTitulo(), c.getCuerpo(),
                c.getAutor() != null ? c.getAutor().nombreCompleto() : "—",
                c.getDirigidoA(),
                c.getAula() != null ? c.getAula().getId() : null,
                c.getAula() != null ? c.getAula().etiqueta() : null,
                c.getPublicadoEn() != null ? c.getPublicadoEn().format(FECHA) : null,
                c.getPublicadoEn() != null,
                lecturas, destinatarios,
                lecturaRepository.existsByComunicadoIdAndUsuarioId(c.getId(), usuarioId));
    }
}
