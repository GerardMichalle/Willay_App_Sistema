package com.willay.controller;

import com.willay.dto.LecturaDto;
import com.willay.dto.LecturaRequest;
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
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/asistencia")
@RequiredArgsConstructor
@Tag(name = "Asistencia", description = "Recepción de lecturas y monitoreo en tiempo real")
public class AsistenciaController {

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

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Canal SSE: empuja cada lectura nueva al navegador")
    public SseEmitter stream() {
        return monitor.suscribir(CurrentUser.colegioId());
    }

    /** El docente solo recibe lecturas de sus aulas; el resto, todas. */
    private List<Long> aulasPermitidas() {
        var quien = CurrentUser.get();
        return quien.getRol() == Rol.DOCENTE
                ? docenteAulaRepository.aulasDelUsuarioDocente(quien.getId())
                : null;
    }
}
