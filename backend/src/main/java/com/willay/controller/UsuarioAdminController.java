package com.willay.controller;

import com.willay.dto.UsuarioAdminDto;
import com.willay.service.UsuarioAdminService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Cuentas del colegio")
public class UsuarioAdminController {

    private final UsuarioAdminService usuarioAdminService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lista todas las cuentas del colegio")
    public List<UsuarioAdminDto> listar() {
        return usuarioAdminService.listar(CurrentUser.colegioId());
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Suspende o reactiva una cuenta")
    public UsuarioAdminDto cambiarEstado(@PathVariable Long id, @RequestParam boolean activo) {
        return usuarioAdminService.cambiarEstado(CurrentUser.colegioId(), id, activo, CurrentUser.usuarioId());
    }

    @PostMapping("/{id}/reenviar-codigo")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reemite el código de activación de una cuenta pendiente")
    public UsuarioAdminDto reenviarCodigo(@PathVariable Long id) {
        return usuarioAdminService.reenviarCodigo(CurrentUser.colegioId(), id);
    }
}
