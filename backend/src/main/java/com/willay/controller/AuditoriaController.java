package com.willay.controller;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.AuditoriaGlobalDto;
import com.willay.dto.PaginaDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Auditoría global entre colegios. Exclusivo del rol SUPER_ADMIN: ningún
 * administrador de colegio puede ver eventos de otros colegios.
 */
@RestController
@RequestMapping("/api/superadmin/auditoria")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin", description = "Auditoría global entre colegios")
public class AuditoriaController {

    private static final int TAMANO_MAX = 200;

    private final AuditoriaService auditoriaService;

    @GetMapping
    @Operation(summary = "Eventos de auditoría de todos los colegios, con filtros opcionales")
    public PaginaDto<AuditoriaGlobalDto> listar(
            @RequestParam(required = false) Long colegioId,
            @RequestParam(required = false) AccionAuditoria accion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return auditoriaService.listar(colegioId, accion,
                PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAX)));
    }
}
