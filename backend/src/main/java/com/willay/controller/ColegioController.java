package com.willay.controller;

import com.willay.dto.ColegioDto;
import com.willay.dto.CrearColegioRequest;
import com.willay.service.ColegioService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Panel del proveedor. Exclusivo del rol SUPER_ADMIN: ningún administrador
 * de colegio puede ver ni tocar estos endpoints.
 */
@RestController
@RequestMapping("/api/superadmin/colegios")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin", description = "Administración de instituciones cliente")
public class ColegioController {

    private final ColegioService colegioService;

    @GetMapping
    @Operation(summary = "Lista todos los colegios con sus métricas")
    public List<ColegioDto> listar() {
        return colegioService.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registra un colegio nuevo con su sede y su cuenta de administración")
    public ColegioDto crear(@Valid @RequestBody CrearColegioRequest req, HttpServletRequest http) {
        return colegioService.crear(CurrentUser.usuarioId(), req, http.getRemoteAddr());
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Suspende o reactiva un colegio (conserva todos sus datos)")
    public ColegioDto cambiarEstado(@PathVariable Long id,
                                    @RequestParam boolean activo,
                                    HttpServletRequest http) {
        return colegioService.cambiarEstado(CurrentUser.usuarioId(), id, activo, http.getRemoteAddr());
    }
}
