package com.willay.controller;

import com.willay.dto.PaginaDto;
import com.willay.dto.UsuarioAdminDto;
import com.willay.entity.EstadoUsuario;
import com.willay.service.UsuarioAdminService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Tag(name = "Usuarios", description = "Cuentas del colegio")
public class UsuarioAdminController {

    private static final int TAMANO_MAX = 200;

    private final UsuarioAdminService usuarioAdminService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lista todas las cuentas del colegio, con búsqueda y filtro de estado opcionales")
    public PaginaDto<UsuarioAdminDto> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) EstadoUsuario estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return usuarioAdminService.listar(CurrentUser.colegioId(), q, estado,
                PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAX)));
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
