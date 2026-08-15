package com.willay.controller;

import com.willay.dto.ComunicadoDto;
import com.willay.dto.GuardarComunicadoRequest;
import com.willay.service.ComunicadoService;
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
@RequestMapping("/api/comunicados")
@RequiredArgsConstructor
@Tag(name = "Comunicados", description = "Avisos institucionales y por aula")
public class ComunicadoController {

    private final ComunicadoService comunicadoService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Comunicados visibles para el usuario autenticado")
    public List<ComunicadoDto> listar() {
        return comunicadoService.listar(CurrentUser.get());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crea un comunicado; puede quedar en borrador o publicarse")
    public ComunicadoDto crear(@Valid @RequestBody GuardarComunicadoRequest req) {
        return comunicadoService.crear(CurrentUser.get(), req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Actualiza un comunicado")
    public ComunicadoDto actualizar(@PathVariable Long id, @Valid @RequestBody GuardarComunicadoRequest req) {
        return comunicadoService.actualizar(CurrentUser.get(), id, req);
    }

    @PostMapping("/{id}/publicar")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Publica un borrador y notifica a los destinatarios")
    public ComunicadoDto publicar(@PathVariable Long id) {
        return comunicadoService.publicar(CurrentUser.get(), id);
    }

    @PostMapping("/{id}/leido")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Marca el comunicado como leído por el usuario")
    public ResponseEntity<Void> leido(@PathVariable Long id) {
        comunicadoService.marcarLeido(CurrentUser.usuarioId(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Elimina un comunicado")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        comunicadoService.eliminar(CurrentUser.colegioId(), id);
        return ResponseEntity.noContent().build();
    }
}
