package com.willay.controller;

import com.willay.dto.PuntoAccesoDto;
import com.willay.service.PuntoAccesoService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/puntos-acceso")
@RequiredArgsConstructor
@Tag(name = "Lectores", description = "Dispositivos de lectura instalados en las puertas")
public class PuntoAccesoController {

    private final PuntoAccesoService puntoAccesoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Lectores registrados y su estado de conexión")
    public List<PuntoAccesoDto> listar() {
        return puntoAccesoService.listar(CurrentUser.colegioId());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registra un lector y devuelve su credencial (única vez)")
    public PuntoAccesoDto crear(@RequestBody Map<String, String> body) {
        return puntoAccesoService.crear(CurrentUser.colegioId(), body.get("nombre"));
    }

    @PostMapping("/{id}/regenerar-clave")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Genera una credencial nueva e invalida la anterior")
    public PuntoAccesoDto regenerar(@PathVariable Long id) {
        return puntoAccesoService.regenerarClave(CurrentUser.colegioId(), id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desactiva un lector")
    public ResponseEntity<Void> desactivar(@PathVariable Long id) {
        puntoAccesoService.desactivar(CurrentUser.colegioId(), id);
        return ResponseEntity.noContent().build();
    }
}
