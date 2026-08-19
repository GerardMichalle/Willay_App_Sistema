package com.willay.controller;

import com.willay.dto.ApoderadoDto;
import com.willay.dto.CrearCuentaApoderadoRequest;
import com.willay.dto.CuentaCreadaDto;
import com.willay.service.ApoderadoService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/apoderados")
@RequiredArgsConstructor
@Tag(name = "Apoderados", description = "Familias vinculadas a los estudiantes")
public class ApoderadoController {

    private final ApoderadoService apoderadoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Lista los apoderados con sus hijos y estado de cuenta")
    public List<ApoderadoDto> listar() {
        return apoderadoService.listar(CurrentUser.colegioId());
    }

    @PostMapping("/{id}/cuenta")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crea la cuenta web de un apoderado ya vinculado que todavía no la tiene")
    public CuentaCreadaDto crearCuenta(@PathVariable Long id, @Valid @RequestBody CrearCuentaApoderadoRequest req,
                                       HttpServletRequest http) {
        return apoderadoService.crearCuenta(CurrentUser.get(), id, req.correo(), http.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Elimina un apoderado sin cuenta activa (sin historial real todavía)")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, HttpServletRequest http) {
        apoderadoService.eliminar(CurrentUser.get(), id, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
