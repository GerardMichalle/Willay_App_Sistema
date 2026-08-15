package com.willay.controller;

import com.willay.service.ExportacionService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/exportar")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
@Tag(name = "Exportación", description = "Descarga de listados en Excel")
public class ExportacionController {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ExportacionService exportacionService;

    @GetMapping("/alumnos")
    @Operation(summary = "Padrón de estudiantes en Excel")
    public ResponseEntity<byte[]> alumnos() {
        return archivo("willay-alumnos.xlsx", exportacionService.alumnos(CurrentUser.colegioId()));
    }

    @GetMapping("/asistencia")
    @Operation(summary = "Asistencia de una fecha en Excel")
    public ResponseEntity<byte[]> asistencia(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        LocalDate dia = fecha != null ? fecha : LocalDate.now();
        return archivo("willay-asistencia-" + dia + ".xlsx",
                exportacionService.asistencia(CurrentUser.colegioId(), dia));
    }

    private ResponseEntity<byte[]> archivo(String nombre, byte[] contenido) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .contentType(MediaType.parseMediaType(XLSX))
                .body(contenido);
    }
}
