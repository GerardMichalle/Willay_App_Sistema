package com.willay.service;

import com.willay.dto.AsistenciaHistorialDto;
import com.willay.dto.LecturaDto;
import com.willay.dto.LecturaRequest;
import com.willay.dto.TarjetaSinAsignarDto;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import com.willay.util.ZonaHoraria;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Núcleo de asistencia: recibe las lecturas del hardware y las convierte
 * en registros de asistencia.
 *
 * Reglas implementadas:
 *
 *  · El punto de acceso se autentica con su propia api-key. Un lector
 *    suplantado no puede inyectar asistencias falsas.
 *  · Sentido automático: la primera lectura del día es ENTRADA y la
 *    siguiente SALIDA, con una ventana de gracia que descarta el doble
 *    toque accidental (el alumno que pasa la tarjeta dos veces seguidas).
 *  · Puntualidad según el parámetro HORA_TOLERANCIA del colegio.
 *  · Cada ingreso genera una notificación para los apoderados vinculados.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AsistenciaService {

    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final ZoneId ZONA = ZonaHoraria.LIMA;

    /** Lecturas repetidas dentro de este lapso se ignoran. */
    private static final int GRACIA_SEGUNDOS = 90;

    private final PuntoAccesoRepository puntoAccesoRepository;
    private final TarjetaRfidRepository tarjetaRepository;
    private final AlumnoRepository alumnoRepository;
    private final RegistroAccesoRepository registroRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final AsistenciaDiaRepository asistenciaDiaRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final NotificacionService notificacionService;
    private final ConfiguracionRepository configuracionRepository;
    private final PasswordEncoder passwordEncoder;
    private final MonitorAsistenciaService monitor;
    private final AlumnoService alumnoService;

    // ── Recepción de la lectura ──────────────────────────────────────

    @Transactional
    public LecturaDto registrarLectura(String apiKey, LecturaRequest req) {
        PuntoAcceso punto = autenticarPunto(apiKey);
        Long colegioId = punto.getColegio().getId();

        punto.setUltimoLatido(OffsetDateTime.now());   // señal de "en línea"

        String codigoTarjeta = req.tarjeta().trim().toUpperCase();
        Alumno alumno;
        try {
            alumno = resolverAlumno(colegioId, codigoTarjeta);
        } catch (NotFoundException e) {
            // No es un fallo silencioso para nadie: si hay una pantalla de
            // "Vincular tarjetas" abierta para este colegio, se entera al
            // instante. El lector sigue recibiendo su 404 normal.
            monitor.difundirTarjetaSinAsignar(colegioId,
                    new TarjetaSinAsignarDto(codigoTarjeta, OffsetDateTime.now().toString()));
            throw e;
        }

        LocalDate hoy = LocalDate.now(ZONA);
        LocalDateTime ahora = LocalDateTime.now(ZONA);

        // Ventana de gracia: evita registrar dos veces la misma pasada
        Optional<RegistroAcceso> ultima = registroRepository
                .findTopByAlumnoIdAndMomentoAfterOrderByMomentoDesc(
                        alumno.getId(), OffsetDateTime.now().minusSeconds(GRACIA_SEGUNDOS));
        if (ultima.isPresent()) {
            log.debug("Lectura repetida ignorada para {}", alumno.getCodigo());
            return construirDto(ultima.get(), alumno, punto, "REPETIDA");
        }

        String tipo = req.tipo() != null && !req.tipo().isBlank()
                ? req.tipo().toUpperCase()
                : determinarSentido(alumno.getId(), hoy);

        RegistroAcceso registro = new RegistroAcceso();
        registro.setColegio(punto.getColegio());
        registro.setAlumno(alumno);
        registro.setPuntoAcceso(punto);
        registro.setTarjetaCodigo(codigoTarjeta);
        registro.setMetodo(req.metodo() == null || req.metodo().isBlank() ? "RFID" : req.metodo().toUpperCase());
        registro.setTipo(tipo);
        registro.setMomento(OffsetDateTime.now());
        registroRepository.save(registro);

        String estado = actualizarAsistencia(colegioId, alumno, hoy, ahora.toLocalTime(), tipo);

        LecturaDto dto = construirDto(registro, alumno, punto, estado);
        monitor.difundir(colegioId, dto);              // pantallas en vivo
        notificarApoderados(colegioId, alumno, tipo, ahora.toLocalTime());

        return dto;
    }

    // ── Consulta ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LecturaDto> lecturasDeHoy(Long colegioId, List<Long> aulasPermitidas) {
        OffsetDateTime desde = LocalDate.now(ZONA).atStartOfDay(ZONA).toOffsetDateTime();
        return registroRepository.findByColegioIdAndMomentoAfterOrderByMomentoDesc(colegioId, desde)
                .stream()
                .filter(r -> aulasPermitidas == null
                        || (r.getAlumno().getAula() != null
                            && aulasPermitidas.contains(r.getAlumno().getAula().getId())))
                .limit(60)
                .map(r -> construirDto(r, r.getAlumno(), r.getPuntoAcceso(),
                        estadoDelDia(r.getAlumno().getId(), LocalDate.now(ZONA))))
                .toList();
    }

    /**
     * Historial real por rango de fechas, acotado al mismo alcance de
     * alumnoService.alumnosVisibles() (docente → sus aulas, apoderado → sus
     * hijos, alumno → él mismo, admin/dirección → todo el colegio).
     */
    @Transactional(readOnly = true)
    public List<AsistenciaHistorialDto> historial(UsuarioPrincipal quien, LocalDate desde, LocalDate hasta) {
        List<Alumno> visibles = alumnoService.alumnosVisibles(quien);
        if (visibles.isEmpty()) return List.of();

        Map<Long, Alumno> porId = visibles.stream()
                .collect(Collectors.toMap(Alumno::getId, a -> a, (a, b) -> a));

        return asistenciaDiaRepository.enRango(porId.keySet(), desde, hasta).stream()
                .sorted(Comparator.comparing(Asistencia::getFecha).reversed())
                .map(a -> {
                    Alumno al = porId.get(a.getAlumno().getId());
                    Aula aula = al.getAula();
                    return new AsistenciaHistorialDto(
                            al.getId(), al.getCodigo(), al.nombreCompleto(),
                            aula != null ? aula.getGrado() + "°" : null,
                            aula != null ? aula.getSeccion() : null,
                            a.getFecha().toString(),
                            a.getHoraEntrada() != null ? a.getHoraEntrada().format(HORA) : null,
                            a.getHoraSalida() != null ? a.getHoraSalida().format(HORA) : null,
                            a.getEstado());
                })
                .toList();
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private PuntoAcceso autenticarPunto(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BusinessException("Falta la credencial del lector (cabecera X-Api-Key)");
        }
        // Se comparan hashes: la clave nunca se almacena en claro
        return puntoAccesoRepository.findByActivoTrue().stream()
                .filter(p -> passwordEncoder.matches(apiKey, p.getApiKeyHash()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Lector no reconocido o desactivado"));
    }

    private Alumno resolverAlumno(Long colegioId, String codigoTarjeta) {
        // Admite tanto el código de tarjeta como el contenido del QR
        String codigo = codigoTarjeta.startsWith("WILLAY|")
                ? codigoTarjeta.split("\\|")[2]
                : codigoTarjeta;

        Optional<Alumno> porTarjeta = tarjetaRepository
                .findByColegioIdAndCodigoAndEstado(colegioId, codigo, "ACTIVA")
                .map(TarjetaRfid::getAlumno);
        if (porTarjeta.isPresent()) return porTarjeta.get();

        return alumnoRepository.findByColegioIdAndCodigo(colegioId, codigo)
                .orElseThrow(() -> new NotFoundException(
                        "La tarjeta " + codigoTarjeta + " no está asignada a ningún estudiante"));
    }

    /** Alterna entrada/salida según el último registro del día. */
    private String determinarSentido(Long alumnoId, LocalDate dia) {
        OffsetDateTime inicio = dia.atStartOfDay(ZONA).toOffsetDateTime();
        return registroRepository.findTopByAlumnoIdAndMomentoAfterOrderByMomentoDesc(alumnoId, inicio)
                .map(r -> "ENTRADA".equals(r.getTipo()) ? "SALIDA" : "ENTRADA")
                .orElse("ENTRADA");
    }

    private String actualizarAsistencia(Long colegioId, Alumno alumno, LocalDate dia,
                                        LocalTime hora, String tipo) {
        Asistencia asistencia = asistenciaRepository.findByAlumnoIdAndFecha(alumno.getId(), dia)
                .orElseGet(() -> {
                    Asistencia nueva = new Asistencia();
                    nueva.setColegioId(colegioId);
                    nueva.setAlumno(alumno);
                    nueva.setFecha(dia);
                    return nueva;
                });

        if ("ENTRADA".equals(tipo)) {
            if (asistencia.getHoraEntrada() == null) {
                asistencia.setHoraEntrada(hora);
                asistencia.setEstado(hora.isAfter(horaTolerancia(colegioId)) ? "TARDANZA" : "PUNTUAL");
            }
        } else {
            asistencia.setHoraSalida(hora);
            if (asistencia.getEstado() == null) asistencia.setEstado("PUNTUAL");
        }

        asistenciaRepository.save(asistencia);
        return asistencia.getEstado();
    }

    private LocalTime horaTolerancia(Long colegioId) {
        return configuracionRepository.findByColegioIdAndClave(colegioId, "HORA_TOLERANCIA")
                .map(c -> {
                    try { return LocalTime.parse(c.getValor()); }
                    catch (Exception e) { return LocalTime.of(8, 0); }
                })
                .orElse(LocalTime.of(8, 0));
    }

    private String estadoDelDia(Long alumnoId, LocalDate dia) {
        return asistenciaRepository.findByAlumnoIdAndFecha(alumnoId, dia)
                .map(Asistencia::getEstado).orElse("SIN_REGISTRO");
    }

    /** Aviso en la app para cada apoderado vinculado. */
    private void notificarApoderados(Long colegioId, Alumno alumno, String tipo, LocalTime hora) {
        String accion = "ENTRADA".equals(tipo) ? "ingresó al colegio" : "salió del colegio";
        String texto = alumno.getNombres() + " " + accion + " a las " + hora.format(HORA) + ".";

        for (AlumnoApoderado vinculo : vinculoRepository.findByAlumnoId(alumno.getId())) {
            Usuario cuenta = vinculo.getApoderado().getUsuario();
            if (cuenta == null) continue;

            notificacionService.crear(cuenta, "ENTRADA".equals(tipo) ? "INGRESO_HIJO" : "SALIDA_HIJO",
                    alumno.getNombres() + " " + ("ENTRADA".equals(tipo) ? "ingresó" : "salió"), texto);
            // TODO: cuando se contrate el proveedor de mensajería, encolar aquí el envío por WhatsApp
        }
    }

    private LecturaDto construirDto(RegistroAcceso r, Alumno alumno, PuntoAcceso punto, String estado) {
        Aula aula = alumno.getAula();
        return new LecturaDto(
                r.getId(),
                alumno.getId(),
                alumno.getCodigo(),
                alumno.nombreCompleto(),
                aula != null ? aula.getGrado() + "\u00b0" + aula.getSeccion() : "—",
                r.getTarjetaCodigo(),
                r.getMetodo(),
                r.getTipo(),
                r.getMomento().atZoneSameInstant(ZONA).toLocalTime().format(HORA),
                estado,
                punto != null ? punto.getNombre() : "—",
                alumno.getFotoUrl());
    }
}
