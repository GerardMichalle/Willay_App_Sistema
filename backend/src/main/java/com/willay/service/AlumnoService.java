package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.AlumnoDto;
import com.willay.dto.CuentaCreadaDto;
import com.willay.dto.GuardarAlumnoRequest;
import com.willay.dto.PaginaDto;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gestión de estudiantes.
 *
 * Dos reglas de negocio que se aplican SIEMPRE aquí, nunca en el frontend:
 *
 *  1. Aislamiento por colegio: el colegioId viene del token.
 *  2. Alcance por rol: ADMIN y DIRECCIÓN ven todo el colegio; el DOCENTE
 *     solo las aulas que tiene asignadas; el APODERADO solo sus hijos.
 *
 * La baja es lógica (estado RETIRADO): los registros de asistencia,
 * conducta y libretas deben conservarse por obligación legal e histórica.
 */
@Service
@RequiredArgsConstructor
public class AlumnoService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final AlumnoRepository alumnoRepository;
    private final AulaRepository aulaRepository;
    private final TarjetaRfidRepository tarjetaRepository;
    private final AsistenciaDiaRepository asistenciaDiaRepository;
    private final AlumnoApoderadoRepository alumnoApoderadoRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final ColegioRepository colegioRepository;
    private final UsuarioRepository usuarioRepository;
    private final CodigoActivacionService codigoActivacionService;
    private final AuditoriaService auditoria;

    // ── Lectura ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaginaDto<AlumnoDto> listar(UsuarioPrincipal quien, String q, Long aulaId,
                                        boolean soloSinTarjeta, Pageable pageable) {
        Long colegioId = quien.getColegioId();
        // Cadena vacía en lugar de null: PostgreSQL necesita el tipo definido
        String busqueda = (q == null || q.isBlank()) ? "" : q.trim();

        Page<Alumno> pagina = switch (quien.getRol()) {
            case ADMIN, DIRECCION -> alumnoRepository.buscar(colegioId, busqueda, aulaId, soloSinTarjeta, pageable);
            case DOCENTE -> {
                List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
                yield aulas.isEmpty()
                        ? Page.empty(pageable)
                        : alumnoRepository.buscarEnAulas(colegioId, aulas, busqueda, aulaId, soloSinTarjeta, pageable);
            }
            case APODERADO -> {
                List<Alumno> hijos = alumnoRepository.hijosDelApoderado(quien.getId());
                yield new PageImpl<>(hijos, pageable, hijos.size());
            }
            case ALUMNO -> {
                // El estudiante consulta su propia ficha: es lo que alimenta
                // su portal (ingreso del día, credencial, código QR).
                List<Alumno> yo = alumnoRepository.findByUsuarioId(quien.getId())
                        .map(List::of).orElse(List.of());
                yield new PageImpl<>(yo, pageable, yo.size());
            }
            default -> Page.empty(pageable);   // SUPER_ADMIN no consulta estudiantes
        };

        return PaginaDto.de(pagina.map(enriquecedor(pagina.getContent())));
    }

    /**
     * Lista completa (sin paginar ni enriquecer) de los alumnos visibles para
     * este usuario, mismo alcance por rol que listar(). Pensado para consultas
     * que solo necesitan "a quiénes puede ver" — p. ej. el historial de
     * asistencia por rango de fechas — sin pagar el costo de enriquecer cada
     * fila con tarjeta/apoderado/asistencia de hoy.
     */
    @Transactional(readOnly = true)
    public List<Alumno> alumnosVisibles(UsuarioPrincipal quien) {
        Long colegioId = quien.getColegioId();
        return switch (quien.getRol()) {
            case ADMIN, DIRECCION -> alumnoRepository.findByColegioIdOrderByApellidosAsc(colegioId);
            case DOCENTE -> {
                List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
                yield aulas.stream()
                        .flatMap(aulaId -> alumnoRepository.findByAulaIdOrderByApellidosAsc(aulaId).stream())
                        .toList();
            }
            case APODERADO -> alumnoRepository.hijosDelApoderado(quien.getId());
            case ALUMNO -> alumnoRepository.findByUsuarioId(quien.getId()).map(List::of).orElse(List.of());
            default -> List.of();   // SUPER_ADMIN no consulta estudiantes
        };
    }

    @Transactional(readOnly = true)
    public AlumnoDto porId(UsuarioPrincipal quien, Long id) {
        Alumno alumno = buscarDelColegio(quien.getColegioId(), id);
        verificarAlcance(quien, alumno);
        return enriquecedor(List.of(alumno)).apply(alumno);
    }

    // ── Escritura ────────────────────────────────────────────────────

    @Transactional
    public AlumnoDto crear(UsuarioPrincipal quien, GuardarAlumnoRequest req, String ip) {
        Long colegioId = quien.getColegioId();

        if (req.dni() != null && !req.dni().isBlank()
                && alumnoRepository.existsByColegioIdAndDni(colegioId, req.dni())) {
            throw new BusinessException("Ya existe un estudiante con el DNI " + req.dni());
        }

        Aula aula = aulaRepository.findByIdAndColegioId(req.aulaId(), colegioId)
                .orElseThrow(() -> new NotFoundException("El aula indicada no existe en este colegio"));

        Alumno alumno = new Alumno();
        alumno.setColegio(colegioRepository.getReferenceById(colegioId));
        alumno.setCodigo(siguienteCodigo(colegioId));
        aplicar(alumno, req, aula);
        alumnoRepository.save(alumno);

        if (req.tarjetaRfid() != null && !req.tarjetaRfid().isBlank()) {
            vincularTarjeta(colegioId, alumno, req.tarjetaRfid().trim());
        }

        auditoria.registrar(AccionAuditoria.ALUMNO_CREADO, colegioId, quien.getId(),
                alumno.getCodigo() + " · " + alumno.nombreCompleto(), ip);

        return enriquecedor(List.of(alumno)).apply(alumno);
    }

    @Transactional
    public AlumnoDto actualizar(UsuarioPrincipal quien, Long id, GuardarAlumnoRequest req, String ip) {
        Long colegioId = quien.getColegioId();
        Alumno alumno = buscarDelColegio(colegioId, id);

        Aula aula = aulaRepository.findByIdAndColegioId(req.aulaId(), colegioId)
                .orElseThrow(() -> new NotFoundException("El aula indicada no existe en este colegio"));

        aplicar(alumno, req, aula);

        String tarjeta = req.tarjetaRfid() == null ? null : req.tarjetaRfid().trim();
        Optional<TarjetaRfid> actual = tarjetaRepository.findByAlumnoIdAndEstado(alumno.getId(), "ACTIVA");
        if (tarjeta != null && !tarjeta.isBlank()) {
            if (actual.isEmpty() || !actual.get().getCodigo().equals(tarjeta)) {
                actual.ifPresent(t -> t.setEstado("ANULADA"));   // una sola tarjeta activa por alumno
                vincularTarjeta(colegioId, alumno, tarjeta);
            }
        }

        auditoria.registrar(AccionAuditoria.ALUMNO_ACTUALIZADO, colegioId, quien.getId(),
                alumno.getCodigo(), ip);

        return enriquecedor(List.of(alumno)).apply(alumno);
    }

    /** Baja lógica: conserva el historial académico y de asistencia. */
    @Transactional
    public void retirar(UsuarioPrincipal quien, Long id, String ip) {
        Alumno alumno = buscarDelColegio(quien.getColegioId(), id);
        if ("RETIRADO".equals(alumno.getEstado())) {
            throw new BusinessException("El estudiante ya figura como retirado");
        }
        alumno.setEstado("RETIRADO");
        tarjetaRepository.findByAlumnoIdAndEstado(alumno.getId(), "ACTIVA")
                .ifPresent(t -> t.setEstado("ANULADA"));

        auditoria.registrar(AccionAuditoria.ALUMNO_RETIRADO, quien.getColegioId(), quien.getId(),
                alumno.getCodigo() + " · " + alumno.nombreCompleto(), ip);
    }

    /**
     * Vinculación rápida usada por la pantalla "Vincular tarjetas": un solo
     * clic tras detectar el UID en el lector, sin pasar por el formulario
     * completo de edición. Misma regla de "una sola tarjeta activa por
     * alumno" que ya aplica actualizar().
     */
    @Transactional
    public AlumnoDto asignarTarjetaRapida(UsuarioPrincipal quien, Long id, String uid, String ip) {
        Long colegioId = quien.getColegioId();
        Alumno alumno = buscarDelColegio(colegioId, id);
        String codigo = uid.trim().toUpperCase();

        Optional<TarjetaRfid> actual = tarjetaRepository.findByAlumnoIdAndEstado(alumno.getId(), "ACTIVA");
        if (actual.isPresent() && actual.get().getCodigo().equals(codigo)) {
            return enriquecedor(List.of(alumno)).apply(alumno);   // ya estaba vinculada: nada que hacer
        }
        actual.ifPresent(t -> t.setEstado("ANULADA"));
        vincularTarjeta(colegioId, alumno, codigo);

        auditoria.registrar(AccionAuditoria.TARJETA_VINCULADA, colegioId, quien.getId(),
                codigo + " → " + alumno.getCodigo() + " · " + alumno.nombreCompleto(), ip);

        return enriquecedor(List.of(alumno)).apply(alumno);
    }

    /**
     * Crea la cuenta web de un estudiante ya matriculado que todavía no la
     * tiene (típicamente: un colegio que en primaria no le da cuenta al
     * alumno y en secundaria decide activarla). Si al estudiante le falta
     * el DNI, este es el único momento en que se le puede completar aquí —
     * el resto de la ficha se edita desde el formulario normal.
     */
    @Transactional
    public CuentaCreadaDto crearCuentaAlumno(UsuarioPrincipal quien, Long id, String correo, String dniNuevo, String ip) {
        Long colegioId = quien.getColegioId();
        Alumno alumno = buscarDelColegio(colegioId, id);

        if (alumno.getUsuario() != null) {
            throw new BusinessException("Este estudiante ya tiene una cuenta web");
        }

        if (alumno.getDni() == null || alumno.getDni().isBlank()) {
            String dni = dniNuevo == null ? null : dniNuevo.trim();
            if (dni == null || dni.isBlank()) {
                throw new BusinessException("Debes indicar el DNI del estudiante para crear su cuenta");
            }
            if (alumnoRepository.existsByColegioIdAndDni(colegioId, dni)) {
                throw new BusinessException("Ya existe un estudiante con el DNI " + dni);
            }
            alumno.setDni(dni);
        }

        String correoLimpio = correo.trim().toLowerCase();
        if (usuarioRepository.existsByCorreoIgnoreCase(correoLimpio)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correoLimpio);
        }

        Usuario cuenta = new Usuario();
        cuenta.setColegio(alumno.getColegio());
        cuenta.setCorreo(correoLimpio);
        cuenta.setRol(Rol.ALUMNO);
        cuenta.setNombres(alumno.getNombres());
        cuenta.setApellidos(alumno.getApellidos());
        cuenta.setDni(alumno.getDni());
        cuenta.setEstado(EstadoUsuario.PENDIENTE);
        usuarioRepository.save(cuenta);
        alumno.setUsuario(cuenta);

        String codigo = codigoActivacionService.emitir(cuenta, alumno.getDni()).getCodigo();

        auditoria.registrar(AccionAuditoria.CUENTA_ALUMNO_CREADA, colegioId, quien.getId(),
                alumno.getCodigo() + " · " + alumno.nombreCompleto(), ip);

        return new CuentaCreadaDto(codigo);
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private void aplicar(Alumno alumno, GuardarAlumnoRequest req, Aula aula) {
        alumno.setNombres(req.nombres().trim());
        alumno.setApellidos(req.apellidos().trim());
        alumno.setDni(req.dni() == null || req.dni().isBlank() ? null : req.dni().trim());
        alumno.setFechaNacimiento(req.fechaNacimiento());
        alumno.setAula(aula);
    }

    private void vincularTarjeta(Long colegioId, Alumno alumno, String codigo) {
        tarjetaRepository.findByColegioIdAndCodigoAndEstado(colegioId, codigo, "ACTIVA").ifPresent(existente -> {
            Alumno dueno = existente.getAlumno();
            String aulaTxt = dueno.getAula() != null ? " · " + dueno.getAula().etiqueta() : "";
            throw new BusinessException("La tarjeta " + codigo + " ya está asignada a "
                    + dueno.nombreCompleto() + aulaTxt);
        });
        TarjetaRfid t = new TarjetaRfid();
        t.setColegio(alumno.getColegio());
        t.setAlumno(alumno);
        t.setCodigo(codigo);
        t.setEstado("ACTIVA");
        t.setEmitidaEn(LocalDate.now());
        tarjetaRepository.save(t);
    }

    /** Código correlativo por colegio: A-1001, A-1002… */
    private String siguienteCodigo(Long colegioId) {
        Integer ultimo = alumnoRepository.ultimoCorrelativo(colegioId);
        return "A-" + ((ultimo == null ? 1000 : ultimo) + 1);
    }

    private Alumno buscarDelColegio(Long colegioId, Long id) {
        return alumnoRepository.findByIdAndColegioId(id, colegioId)
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado"));
    }

    /** Un docente no puede tocar alumnos fuera de sus aulas. */
    private void verificarAlcance(UsuarioPrincipal quien, Alumno alumno) {
        if (quien.getRol() == Rol.DOCENTE) {
            List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
            if (alumno.getAula() == null || !aulas.contains(alumno.getAula().getId())) {
                throw new NotFoundException("Estudiante no encontrado");
            }
        }
    }

    /**
     * Arma el DTO agregando tarjeta, apoderado y asistencia del día.
     * Los datos se consultan por lote (no uno por alumno) para evitar N+1.
     */
    private Function<Alumno, AlumnoDto> enriquecedor(List<Alumno> lote) {
        List<Long> ids = lote.stream().map(Alumno::getId).filter(Objects::nonNull).toList();

        Map<Long, String> tarjetas = ids.isEmpty() ? Map.of()
                : tarjetaRepository.findByColegioIdAndEstado(
                        lote.get(0).getColegio().getId(), "ACTIVA").stream()
                    .filter(t -> ids.contains(t.getAlumno().getId()))
                    .collect(Collectors.toMap(t -> t.getAlumno().getId(), TarjetaRfid::getCodigo, (a, b) -> a));

        Map<Long, Asistencia> asistencias = ids.isEmpty() ? Map.of()
                : asistenciaDiaRepository.delDia(LocalDate.now(), ids).stream()
                    .collect(Collectors.toMap(a -> a.getAlumno().getId(), a -> a, (a, b) -> a));

        Map<Long, AlumnoApoderado> apoderados = new HashMap<>();
        for (Long id : ids) {
            alumnoApoderadoRepository.findByAlumnoId(id).stream()
                    .filter(AlumnoApoderado::isEsPrincipal).findFirst()
                    .ifPresent(v -> apoderados.put(id, v));
        }

        return alumno -> {
            Aula aula = alumno.getAula();
            Asistencia asis = asistencias.get(alumno.getId());
            AlumnoApoderado vinculo = apoderados.get(alumno.getId());
            Apoderado ap = vinculo != null ? vinculo.getApoderado() : null;

            return new AlumnoDto(
                    alumno.getId(),
                    alumno.getCodigo(),
                    alumno.getNombres(),
                    alumno.getApellidos(),
                    alumno.getDni(),
                    alumno.getFechaNacimiento(),
                    alumno.getFotoUrl(),
                    alumno.getEstado(),
                    aula != null ? aula.getId() : null,
                    aula != null ? aula.getGrado() + "\u00b0" : null,
                    aula != null ? aula.getSeccion() : null,
                    aula != null ? aula.getNivel() : null,
                    tarjetas.get(alumno.getId()),
                    ap != null ? ap.getNombres() + " " + ap.getApellidos() : null,
                    ap != null ? ap.getTelefono() : null,
                    asis != null && asis.getHoraEntrada() != null ? asis.getHoraEntrada().format(HORA) : null,
                    asis != null && asis.getHoraSalida() != null ? asis.getHoraSalida().format(HORA) : null,
                    asis != null ? asis.getEstado() : "SIN_REGISTRO",
                    alumno.getUsuario() != null ? alumno.getUsuario().getEstado().name() : null);
        };
    }
}
