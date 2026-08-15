package com.willay.controller;

import com.willay.dto.ImportacionDto;
import com.willay.dto.MatriculaRequest;
import com.willay.dto.MatriculaResultadoDto;
import com.willay.service.ImportacionService;
import com.willay.service.MatriculaService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/matriculas")
@RequiredArgsConstructor
@Tag(name = "Matrículas", description = "Alta de estudiantes con su apoderado e importación masiva")
public class MatriculaController {

    private final MatriculaService matriculaService;
    private final ImportacionService importacionService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Matricula un estudiante junto con su apoderado y emite los códigos")
    public MatriculaResultadoDto matricular(@Valid @RequestBody MatriculaRequest req, HttpServletRequest http) {
        return matriculaService.matricular(CurrentUser.colegioId(), CurrentUser.usuarioId(), req, http.getRemoteAddr());
    }

    @GetMapping("/plantilla")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Descarga la plantilla Excel de importación")
    public ResponseEntity<byte[]> plantilla() {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"willay-matriculas.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(importacionService.plantilla());
    }

    @PostMapping(value = "/importar/previsualizar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Valida el Excel y devuelve la vista previa SIN guardar nada")
    public ImportacionDto previsualizar(@RequestParam("archivo") MultipartFile archivo) {
        return importacionService.previsualizar(CurrentUser.colegioId(), archivo);
    }

    @PostMapping(value = "/importar/confirmar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Ejecuta la importación de las filas válidas")
    public List<MatriculaResultadoDto> confirmar(@RequestParam("archivo") MultipartFile archivo,
                                                 HttpServletRequest http) {
        return importacionService.confirmar(CurrentUser.colegioId(), CurrentUser.usuarioId(),
                archivo, http.getRemoteAddr());
    }
}
