package com.willay.controller;

import com.willay.dto.ComunicadoGlobalDto;
import com.willay.dto.ComunicadoGlobalRequest;
import com.willay.service.ColegioService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Acciones del panel del proveedor que no caen bajo un colegio puntual.
 * Exclusivo del rol SUPER_ADMIN.
 */
@RestController
@RequestMapping("/api/superadmin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Tag(name = "Super Admin", description = "Acciones globales del proveedor")
public class SuperadminController {

    private final ColegioService colegioService;

    @PostMapping("/comunicado-global")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Envía un aviso a todos los administradores de todos los colegios activos")
    public void comunicadoGlobal(@Valid @RequestBody ComunicadoGlobalRequest req, HttpServletRequest http) {
        colegioService.enviarComunicadoGlobal(CurrentUser.usuarioId(), req, http.getRemoteAddr());
    }

    @GetMapping("/comunicados-globales")
    @Operation(summary = "Historial de avisos enviados a los administradores de todos los colegios")
    public List<ComunicadoGlobalDto> comunicadosGlobales() {
        return colegioService.listarComunicadosGlobales();
    }
}
