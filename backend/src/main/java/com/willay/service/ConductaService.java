package com.willay.service;

import com.willay.dto.ConductaDto;
import com.willay.dto.GuardarConductaRequest;
import com.willay.entity.*;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import com.willay.util.ZonaHoraria;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Registro de conducta: méritos y observaciones.
 * Al registrar un demérito se notifica a los apoderados, que es
 * precisamente el punto en que el colegio necesita comunicación inmediata.
 */
@Service
@RequiredArgsConstructor
public class ConductaService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final ConductaRepository conductaRepository;
    private final AlumnoRepository alumnoRepository;
    private final ColegioRepository colegioRepository;
    private final UsuarioRepository usuarioRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final NotificacionService notificacionService;

    @Transactional(readOnly = true)
    public List<ConductaDto> listar(UsuarioPrincipal quien) {
        return switch (quien.getRol()) {
            case ALUMNO -> alumnoRepository.findByUsuarioId(quien.getId())
                    .map(a -> conductaRepository.findByAlumnoIdOrderByFechaDesc(a.getId()))
                    .orElse(List.of()).stream().map(this::aDto).toList();

            case APODERADO -> alumnoRepository.hijosDelApoderado(quien.getId()).stream()
                    .flatMap(h -> conductaRepository.findByAlumnoIdOrderByFechaDesc(h.getId()).stream())
                    .map(this::aDto).toList();

            case DOCENTE -> {
                List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
                yield conductaRepository.findByColegioIdOrderByFechaDesc(quien.getColegioId()).stream()
                        .filter(c -> c.getAlumno().getAula() != null
                                && aulas.contains(c.getAlumno().getAula().getId()))
                        .map(this::aDto).toList();
            }

            default -> conductaRepository.findByColegioIdOrderByFechaDesc(quien.getColegioId())
                    .stream().map(this::aDto).toList();
        };
    }

    @Transactional
    public ConductaDto registrar(UsuarioPrincipal quien, GuardarConductaRequest req) {
        Alumno alumno = alumnoRepository.findByIdAndColegioId(req.alumnoId(), quien.getColegioId())
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado"));

        if (quien.getRol() == Rol.DOCENTE) {
            List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
            if (alumno.getAula() == null || !aulas.contains(alumno.getAula().getId())) {
                throw new NotFoundException("Estudiante no encontrado");
            }
        }

        Conducta c = new Conducta();
        c.setColegio(colegioRepository.getReferenceById(quien.getColegioId()));
        c.setAlumno(alumno);
        c.setRegistradoPor(usuarioRepository.getReferenceById(quien.getId()));
        c.setTipo(req.tipo());
        c.setCategoria(req.categoria().trim());
        c.setDescripcion(req.descripcion().trim());
        c.setFecha(req.fecha() != null ? req.fecha() : LocalDate.now(ZonaHoraria.LIMA));
        conductaRepository.save(c);

        notificarApoderados(c);
        return aDto(c);
    }

    @Transactional
    public void eliminar(Long colegioId, Long id) {
        Conducta c = conductaRepository.findById(id)
                .filter(x -> x.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Registro no encontrado"));
        conductaRepository.delete(c);
    }

    private void notificarApoderados(Conducta c) {
        boolean merito = "MERITO".equals(c.getTipo());
        for (AlumnoApoderado v : vinculoRepository.findByAlumnoId(c.getAlumno().getId())) {
            Usuario cuenta = v.getApoderado().getUsuario();
            if (cuenta == null) continue;
            notificacionService.crear(cuenta, "CONDUCTA",
                    (merito ? "Mérito · " : "Observación · ") + c.getAlumno().getNombres(),
                    c.getCategoria() + ": " + c.getDescripcion());
        }
    }

    private ConductaDto aDto(Conducta c) {
        Aula aula = c.getAlumno().getAula();
        return new ConductaDto(
                c.getId(), c.getAlumno().getId(), c.getAlumno().nombreCompleto(),
                c.getAlumno().getCodigo(), aula != null ? aula.etiqueta() : "—",
                c.getTipo(), c.getCategoria(), c.getDescripcion(),
                c.getFecha().format(FECHA),
                c.getRegistradoPor() != null ? c.getRegistradoPor().nombreCompleto() : "—");
    }
}
