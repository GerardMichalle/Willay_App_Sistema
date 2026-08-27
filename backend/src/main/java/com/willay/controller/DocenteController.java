package com.willay.controller;

import com.willay.dto.DocenteDto;
import com.willay.dto.GuardarDocenteRequest;
import com.willay.dto.PaginaDto;
import com.willay.service.DocenteService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docentes")
@RequiredArgsConstructor
@Tag(name = "Docentes", description = "Personal docente del colegio")
public class DocenteController {

    private static final int TAMANO_MAX = 200;

    private final DocenteService docenteService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Lista los docentes del colegio")
    public PaginaDto<DocenteDto> listar(
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return docenteService.listar(CurrentUser.colegioId(),
                PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAX)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Da de alta un docente y emite su código de activación")
    public DocenteDto crear(@Valid @RequestBody GuardarDocenteRequest req, HttpServletRequest http) {
        return docenteService.crear(CurrentUser.colegioId(), CurrentUser.usuarioId(), req, http.getRemoteAddr());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualiza los datos y aulas asignadas de un docente")
    public DocenteDto actualizar(@PathVariable Long id,
                                 @Valid @RequestBody GuardarDocenteRequest req,
                                 HttpServletRequest http) {
        return docenteService.actualizar(CurrentUser.colegioId(), CurrentUser.usuarioId(), id, req, http.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Cesa a un docente: revoca su acceso y libera sus aulas")
    public ResponseEntity<Void> cesar(@PathVariable Long id, HttpServletRequest http) {
        docenteService.cesar(CurrentUser.colegioId(), CurrentUser.usuarioId(), id, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
