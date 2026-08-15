package com.willay.controller;

import com.willay.dto.SetupEstadoDto;
import com.willay.service.SetupService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
@Tag(name = "Configuración inicial", description = "Asistente de puesta en marcha del colegio")
public class SetupController {

    private final SetupService setupService;

    @GetMapping("/estado")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Progreso de la configuración inicial")
    public SetupEstadoDto estado() {
        return setupService.estado(CurrentUser.colegioId());
    }
}
