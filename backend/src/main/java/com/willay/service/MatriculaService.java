package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.MatriculaRequest;
import com.willay.dto.MatriculaResultadoDto;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Proceso de matrícula.
 *
 * Todo ocurre en UNA transacción: o se crea el estudiante con su apoderado,
 * su vínculo, su tarjeta y sus códigos de activación, o no se crea nada.
 * Una matrícula a medias (alumno sin apoderado, por ejemplo) dejaría datos
 * inconsistentes que alguien tendría que reparar a mano.
 *
 * Si el apoderado ya existe en el colegio (por DNI), se reutiliza: así un
 * padre con tres hijos tiene una sola cuenta que ve a los tres.
 */
@Service
@RequiredArgsConstructor
public class MatriculaService {

    private final AlumnoRepository alumnoRepository;
    private final ApoderadoRepository apoderadoRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AulaRepository aulaRepository;
    private final TarjetaRfidRepository tarjetaRepository;
    private final ColegioRepository colegioRepository;
    private final CodigoActivacionService codigoActivacionService;
    private final AuditoriaService auditoria;

    @Transactional
    public MatriculaResultadoDto matricular(Long colegioId, Long autorId, MatriculaRequest req, String ip) {
        Colegio colegio = colegioRepository.getReferenceById(colegioId);
        var da = req.alumno();
        var dp = req.apoderado();

        if (da.dni() != null && !da.dni().isBlank()
                && alumnoRepository.existsByColegioIdAndDni(colegioId, da.dni())) {
            throw new BusinessException("Ya existe un estudiante matriculado con el DNI " + da.dni());
        }

        Aula aula = aulaRepository.findByIdAndColegioId(da.aulaId(), colegioId)
                .orElseThrow(() -> new NotFoundException("El aula indicada no existe en este colegio"));

        // ── Estudiante ──
        Alumno alumno = new Alumno();
        alumno.setColegio(colegio);
        alumno.setCodigo(siguienteCodigo(colegioId));
        alumno.setNombres(da.nombres().trim());
        alumno.setApellidos(da.apellidos().trim());
        alumno.setDni(nulo(da.dni()));
        alumno.setFechaNacimiento(da.fechaNacimiento());
        alumno.setAula(aula);
        alumno.setEstado("MATRICULADO");
        alumnoRepository.save(alumno);

        // ── Tarjeta (opcional) ──
        String tarjeta = nulo(da.tarjetaRfid());
        if (tarjeta != null) {
            if (tarjetaRepository.existsByColegioIdAndCodigoAndEstado(colegioId, tarjeta, "ACTIVA")) {
                throw new BusinessException("La tarjeta " + tarjeta + " ya está asignada a otro estudiante");
            }
            TarjetaRfid t = new TarjetaRfid();
            t.setColegio(colegio);
            t.setAlumno(alumno);
            t.setCodigo(tarjeta);
            t.setEstado("ACTIVA");
            t.setEmitidaEn(LocalDate.now());
            tarjetaRepository.save(t);
        }

        // ── Apoderado: se reutiliza si ya existe por DNI ──
        Apoderado apoderado = apoderadoRepository
                .findByColegioIdAndDni(colegioId, dp.dni())
                .orElseGet(() -> crearApoderado(colegio, dp));

        vinculoRepository.save(crearVinculo(colegioId, alumno, apoderado, dp.parentesco()));

        // ── Códigos de activación ──
        String codigoApoderado = null;
        if (apoderado.getUsuario() != null
                && apoderado.getUsuario().getEstado() == EstadoUsuario.PENDIENTE) {
            codigoApoderado = codigoActivacionService.emitir(apoderado.getUsuario(), apoderado.getDni()).getCodigo();
        }

        String codigoAlumno = null;
        if (da.crearCuenta() && da.correo() != null && !da.correo().isBlank() && alumno.getDni() != null) {
            Usuario cuenta = crearUsuario(colegio, da.correo(), Rol.ALUMNO,
                    alumno.getNombres(), alumno.getApellidos(), alumno.getDni(), null);
            alumno.setUsuario(cuenta);
            codigoAlumno = codigoActivacionService.emitir(cuenta, alumno.getDni()).getCodigo();
        }

        auditoria.registrar(AccionAuditoria.MATRICULA_REGISTRADA, colegioId, autorId,
                alumno.getCodigo() + " · " + alumno.nombreCompleto(), ip);

        return new MatriculaResultadoDto(
                alumno.getId(), alumno.getCodigo(), alumno.nombreCompleto(), aula.etiqueta(), tarjeta,
                apoderado.getId(), apoderado.getNombres() + " " + apoderado.getApellidos(),
                codigoApoderado, codigoAlumno);
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private Apoderado crearApoderado(Colegio colegio, MatriculaRequest.DatosApoderado dp) {
        Apoderado ap = new Apoderado();
        ap.setColegio(colegio);
        ap.setNombres(dp.nombres().trim());
        ap.setApellidos(dp.apellidos().trim());
        ap.setDni(dp.dni());
        ap.setTelefono(nulo(dp.telefono()));
        ap.setCorreo(nulo(dp.correo()));

        // La cuenta web necesita un correo; si no lo hay, el apoderado
        // queda registrado y podrá activarse cuando el colegio lo capture.
        if (ap.getCorreo() != null && !usuarioRepository.existsByCorreoIgnoreCase(ap.getCorreo())) {
            ap.setUsuario(crearUsuario(colegio, ap.getCorreo(), Rol.APODERADO,
                    ap.getNombres(), ap.getApellidos(), ap.getDni(), ap.getTelefono()));
        }
        return apoderadoRepository.save(ap);
    }

    private Usuario crearUsuario(Colegio colegio, String correo, Rol rol,
                                 String nombres, String apellidos, String dni, String telefono) {
        Usuario u = new Usuario();
        u.setColegio(colegio);
        u.setCorreo(correo.trim().toLowerCase());
        u.setRol(rol);
        u.setNombres(nombres);
        u.setApellidos(apellidos);
        u.setDni(dni);
        u.setTelefono(telefono);
        u.setEstado(EstadoUsuario.PENDIENTE);   // activará su cuenta con el código
        return usuarioRepository.save(u);
    }

    private AlumnoApoderado crearVinculo(Long colegioId, Alumno alumno, Apoderado apoderado, String parentesco) {
        AlumnoApoderado v = new AlumnoApoderado();
        v.setColegioId(colegioId);
        v.setAlumno(alumno);
        v.setApoderado(apoderado);
        v.setParentesco(parentesco == null || parentesco.isBlank() ? "APODERADO" : parentesco.toUpperCase());
        v.setEsPrincipal(vinculoRepository.findByAlumnoId(alumno.getId()).isEmpty());
        return v;
    }

    private String siguienteCodigo(Long colegioId) {
        Integer ultimo = alumnoRepository.ultimoCorrelativo(colegioId);
        return "A-" + ((ultimo == null ? 1000 : ultimo) + 1);
    }

    private String nulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    /** Reservado para la importación masiva: valida sin escribir. */
    public Optional<String> validarSinGuardar(Long colegioId, MatriculaRequest req) {
        if (req.alumno().dni() != null && !req.alumno().dni().isBlank()
                && alumnoRepository.existsByColegioIdAndDni(colegioId, req.alumno().dni())) {
            return Optional.of("Ya existe un estudiante con ese DNI");
        }
        if (aulaRepository.findByIdAndColegioId(req.alumno().aulaId(), colegioId).isEmpty()) {
            return Optional.of("El aula indicada no existe");
        }
        return Optional.empty();
    }
}
