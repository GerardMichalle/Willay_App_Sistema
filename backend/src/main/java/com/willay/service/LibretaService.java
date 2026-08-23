package com.willay.service;

import com.willay.dto.GuardarLibretaRequest;
import com.willay.dto.LibretaDto;
import com.willay.dto.SubirLibretaRequest;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import com.willay.util.ZonaHoraria;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Libretas de notas.
 *
 * Una libreta permanece en borrador mientras el docente la trabaja: solo
 * él la ve. Al publicarla se vuelve visible para el estudiante y sus
 * apoderados, y se notifica a estos últimos. El promedio se calcula a
 * partir de las notas registradas, no se escribe a mano.
 */
@Service
@RequiredArgsConstructor
public class LibretaService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final LibretaRepository libretaRepository;
    private final NotaRepository notaRepository;
    private final CursoRepository cursoRepository;
    private final AlumnoRepository alumnoRepository;
    private final ColegioRepository colegioRepository;
    private final UsuarioRepository usuarioRepository;
    private final DocenteAulaRepository docenteAulaRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final NotificacionService notificacionService;

    @Transactional(readOnly = true)
    public List<LibretaDto> listar(UsuarioPrincipal quien, Long alumnoId, Integer anio) {
        short anioEscolar = (short) (anio != null ? anio : java.time.Year.now().getValue());

        return switch (quien.getRol()) {
            case ALUMNO -> alumnoRepository.findByUsuarioId(quien.getId())
                    .map(a -> libretaRepository.findByAlumnoIdAndPublicadaEnIsNotNullOrderByAnioEscolarDesc(a.getId()))
                    .orElse(List.of()).stream().map(this::aDto).toList();

            case APODERADO -> alumnoRepository.hijosDelApoderado(quien.getId()).stream()
                    .flatMap(h -> libretaRepository
                            .findByAlumnoIdAndPublicadaEnIsNotNullOrderByAnioEscolarDesc(h.getId()).stream())
                    .map(this::aDto).toList();

            case DOCENTE -> {
                List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
                yield libretaRepository.findByColegioIdAndAnioEscolar(quien.getColegioId(), anioEscolar).stream()
                        .filter(l -> l.getAlumno().getAula() != null
                                && aulas.contains(l.getAlumno().getAula().getId()))
                        .filter(l -> alumnoId == null || l.getAlumno().getId().equals(alumnoId))
                        .map(this::aDto).toList();
            }

            default -> libretaRepository.findByColegioIdAndAnioEscolar(quien.getColegioId(), anioEscolar).stream()
                    .filter(l -> alumnoId == null || l.getAlumno().getId().equals(alumnoId))
                    .map(this::aDto).toList();
        };
    }

    @Transactional
    public LibretaDto guardar(UsuarioPrincipal quien, GuardarLibretaRequest req) {
        Alumno alumno = alumnoRepository.findByIdAndColegioId(req.alumnoId(), quien.getColegioId())
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado"));
        verificarAlcance(quien, alumno);

        short anio = (short) req.anioEscolar();
        Libreta libreta = libretaRepository
                .findByAlumnoIdAndPeriodoAndAnioEscolar(alumno.getId(), req.periodo(), anio)
                .orElseGet(() -> {
                    Libreta nueva = new Libreta();
                    nueva.setColegio(colegioRepository.getReferenceById(quien.getColegioId()));
                    nueva.setAlumno(alumno);
                    nueva.setPeriodo(req.periodo());
                    nueva.setAnioEscolar(anio);
                    return libretaRepository.save(nueva);
                });

        if (libreta.getPublicadaEn() != null && !req.publicar()) {
            throw new BusinessException("La libreta ya fue publicada y no puede volver a borrador");
        }

        libreta.setObservacion(req.observacion());

        // Se reemplazan las notas del periodo por las recibidas
        notaRepository.deleteAll(notaRepository.findByLibretaId(libreta.getId()));
        BigDecimal suma = BigDecimal.ZERO;
        int cantidad = 0;

        if (req.notas() != null) {
            for (GuardarLibretaRequest.NotaItem item : req.notas()) {
                Curso curso = cursoRepository.findByIdAndColegioId(item.cursoId(), quien.getColegioId())
                        .orElseThrow(() -> new NotFoundException("Curso no encontrado"));
                Nota nota = new Nota();
                nota.setLibreta(libreta);
                nota.setCurso(curso);
                nota.setCalificacion(BigDecimal.valueOf(item.calificacion()));
                nota.setComentario(item.comentario());
                nota.setRegistradoPor(usuarioRepository.getReferenceById(quien.getId()));
                notaRepository.save(nota);

                suma = suma.add(nota.getCalificacion());
                cantidad++;
            }
        }

        libreta.setPromedio(cantidad == 0 ? null
                : suma.divide(BigDecimal.valueOf(cantidad), 2, RoundingMode.HALF_UP));

        if (req.publicar() && libreta.getPublicadaEn() == null) {
            libreta.setPublicadaEn(OffsetDateTime.now());
            libreta.setPublicadaPor(usuarioRepository.getReferenceById(quien.getId()));
            notificarPublicacion(libreta);
        }

        return aDto(libreta);
    }

    /** Publica la libreta como documento escaneado por el tutor del aula (o el Admin). */
    @Transactional
    public LibretaDto subirEscaneada(UsuarioPrincipal quien, SubirLibretaRequest req) {
        Alumno alumno = alumnoRepository.findByIdAndColegioId(req.alumnoId(), quien.getColegioId())
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado"));

        // Solo el tutor del aula (o el Admin) puede subir la libreta.
        if (quien.getRol() == Rol.DOCENTE) {
            List<Long> tutorDe = docenteAulaRepository.aulasDondeEsTutor(quien.getId());
            if (alumno.getAula() == null || !tutorDe.contains(alumno.getAula().getId())) {
                throw new BusinessException("Solo el tutor del aula puede publicar la libreta");
            }
        }

        short anio = (short) req.anioEscolar();
        Libreta libreta = libretaRepository
                .findByAlumnoIdAndPeriodoAndAnioEscolar(alumno.getId(), req.periodo(), anio)
                .orElseGet(() -> {
                    Libreta nueva = new Libreta();
                    nueva.setColegio(alumno.getColegio());
                    nueva.setAlumno(alumno);
                    nueva.setPeriodo(req.periodo());
                    nueva.setAnioEscolar(anio);
                    return nueva;
                });

        // Solo se notifica la primera vez que el bimestre queda publicado:
        // reemplazar un escaneo ya publicado no debe volver a avisar a la familia.
        boolean esPrimeraPublicacion = libreta.getArchivoUuid() == null;

        libreta.setArchivoUuid(extraerUuidDeRuta(req.archivoUrl()));
        libreta.setPublicadaEn(OffsetDateTime.now());
        libreta.setPublicadaPor(usuarioRepository.getReferenceById(quien.getId()));
        libretaRepository.save(libreta);

        if (esPrimeraPublicacion) {
            notificarPublicacion(libreta);
        }
        return aDto(libreta);
    }

    /** Extrae el UUID desde la ruta devuelta por /api/archivos/documento (".../api/archivos/{uuid}"). */
    private UUID extraerUuidDeRuta(String archivoUrl) {
        String segmento = archivoUrl.substring(archivoUrl.lastIndexOf('/') + 1);
        try {
            return UUID.fromString(segmento);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Enlace de archivo inválido");
        }
    }

    private void notificarPublicacion(Libreta libreta) {
        for (AlumnoApoderado v : vinculoRepository.findByAlumnoId(libreta.getAlumno().getId())) {
            Usuario cuenta = v.getApoderado().getUsuario();
            if (cuenta == null) continue;
            notificacionService.crear(cuenta, "LIBRETA", "Libreta publicada · " + libreta.getPeriodo(),
                    "Ya puedes consultar las notas de " + libreta.getAlumno().getNombres() + ".");
        }
    }

    private void verificarAlcance(UsuarioPrincipal quien, Alumno alumno) {
        if (quien.getRol() == Rol.DOCENTE) {
            List<Long> aulas = docenteAulaRepository.aulasDelUsuarioDocente(quien.getId());
            if (alumno.getAula() == null || !aulas.contains(alumno.getAula().getId())) {
                throw new NotFoundException("Estudiante no encontrado");
            }
        }
    }

    private LibretaDto aDto(Libreta l) {
        List<LibretaDto.NotaDto> notas = notaRepository.findByLibretaId(l.getId()).stream()
                .map(n -> new LibretaDto.NotaDto(n.getCurso().getId(), n.getCurso().getNombre(),
                        n.getCurso().getAbreviatura(), n.getCalificacion().doubleValue(), n.getComentario()))
                .toList();

        Aula aula = l.getAlumno().getAula();
        return new LibretaDto(
                l.getId(), l.getAlumno().getId(), l.getAlumno().getCodigo(),
                l.getAlumno().nombreCompleto(), aula != null ? aula.etiqueta() : "—",
                l.getPeriodo(), l.getAnioEscolar(),
                l.getPromedio() != null ? l.getPromedio().doubleValue() : null,
                l.getObservacion(), l.getPublicadaEn() != null,
                l.getPublicadaEn() != null ? l.getPublicadaEn().atZoneSameInstant(ZonaHoraria.LIMA).format(FECHA) : null,
                notas,
                l.getArchivoUuid() != null,
                l.getArchivoUuid() != null ? l.getArchivoUuid().toString() : null);
    }
}
