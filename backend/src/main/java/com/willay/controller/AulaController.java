package com.willay.controller;

import com.willay.dto.AulaDto;
import com.willay.dto.GuardarAulaRequest;
import com.willay.service.AulaService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/aulas")
@RequiredArgsConstructor
@Tag(name = "Aulas", description = "Aulas y secciones del colegio")
public class AulaController {

    private final AulaService aulaService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Lista las aulas activas con su cantidad de estudiantes")
    public List<AulaDto> listar() {
        return aulaService.listar(CurrentUser.colegioId());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crea un aula para un año escolar")
    public AulaDto crear(@Valid @RequestBody GuardarAulaRequest req, HttpServletRequest http) {
        return aulaService.crear(CurrentUser.colegioId(), CurrentUser.usuarioId(), req, http.getRemoteAddr());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualiza un aula")
    public AulaDto actualizar(@PathVariable Long id, @Valid @RequestBody GuardarAulaRequest req,
                              HttpServletRequest http) {
        return aulaService.actualizar(CurrentUser.colegioId(), CurrentUser.usuarioId(), id, req, http.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactiva un aula (solo si no tiene estudiantes)")
    public ResponseEntity<Void> desactivar(@PathVariable Long id, HttpServletRequest http) {
        aulaService.desactivar(CurrentUser.colegioId(), CurrentUser.usuarioId(), id, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
