package com.willay.controller;

import com.willay.dto.AsistenciaHistorialDto;
import com.willay.dto.LecturaDto;
import com.willay.dto.LecturaRequest;
import com.willay.dto.PaginaDto;
import com.willay.entity.Rol;
import com.willay.repository.DocenteAulaRepository;
import com.willay.service.AsistenciaService;
import com.willay.service.MonitorAsistenciaService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/asistencia")
@RequiredArgsConstructor
@Tag(name = "Asistencia", description = "Recepción de lecturas y monitoreo en tiempo real")
public class AsistenciaController {

    private static final int TAMANO_MAX = 200;

    private final AsistenciaService asistenciaService;
    private final MonitorAsistenciaService monitor;
    private final DocenteAulaRepository docenteAulaRepository;

    /**
     * Punto de entrada del hardware. No usa sesión de usuario: el lector
     * se identifica con su propia api-key, por eso está fuera del esquema
     * de seguridad de la documentación.
     */
    @PostMapping("/lectura")
    @SecurityRequirements
    @Operation(summary = "Registra una lectura enviada por un lector RFID/QR")
    public LecturaDto lectura(@RequestHeader(value = "X-Api-Key", required = false) String apiKey,
                              @Valid @RequestBody LecturaRequest req) {
        return asistenciaService.registrarLectura(apiKey, req);
    }

    @GetMapping("/hoy")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Últimas lecturas del día, acotadas al alcance del rol")
    public List<LecturaDto> hoy() {
        return asistenciaService.lecturasDeHoy(CurrentUser.colegioId(), aulasPermitidas());
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE','ALUMNO','APODERADO')")
    @Operation(summary = "Historial real de asistencia por rango de fechas, según el alcance del rol")
    public PaginaDto<AsistenciaHistorialDto> historial(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return asistenciaService.historial(CurrentUser.get(), desde, hasta,
                PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAX)));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Canal SSE: empuja cada lectura nueva al navegador")
    public SseEmitter stream() {
        return monitor.suscribir(CurrentUser.colegioId());
    }

    /**
     * Canal aparte para la pantalla "Vincular tarjetas": mientras esté
     * abierto, cada tarjeta sin dueño detectada por el lector se difunde
     * aquí (ver AsistenciaService.registrarLectura()). Solo Admin, igual
     * que el resto de la gestión de alumnos.
     */
    @GetMapping(value = "/stream/vincular", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Canal SSE: avisa cuando llega una tarjeta sin asignar")
    public SseEmitter streamVincular() {
        return monitor.suscribirVinculacion(CurrentUser.colegioId());
    }

    /** El docente solo recibe lecturas de sus aulas; el resto, todas. */
    private List<Long> aulasPermitidas() {
        var quien = CurrentUser.get();
        return quien.getRol() == Rol.DOCENTE
                ? docenteAulaRepository.aulasDelUsuarioDocente(quien.getId())
                : null;
    }
}
