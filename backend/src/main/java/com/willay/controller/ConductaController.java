package com.willay.controller;

import com.willay.dto.ConductaDto;
import com.willay.dto.GuardarConductaRequest;
import com.willay.service.ConductaService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conducta")
@RequiredArgsConstructor
@Tag(name = "Conducta", description = "Méritos y observaciones de estudiantes")
public class ConductaController {

    private final ConductaService conductaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Registros de conducta según el alcance del rol")
    public List<ConductaDto> listar() {
        return conductaService.listar(CurrentUser.get());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registra un mérito u observación y avisa a los apoderados")
    public ConductaDto registrar(@Valid @RequestBody GuardarConductaRequest req) {
        return conductaService.registrar(CurrentUser.get(), req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Elimina un registro de conducta")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        conductaService.eliminar(CurrentUser.colegioId(), id);
        return ResponseEntity.noContent().build();
    }
}
