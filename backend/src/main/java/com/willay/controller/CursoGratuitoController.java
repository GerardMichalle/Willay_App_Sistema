package com.willay.controller;

import com.willay.dto.*;
import com.willay.service.CursoGratuitoService;
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

/**
 * Catálogo de cursos gratuitos.
 *
 * La consulta está abierta a cualquier usuario autenticado; la gestión del
 * contenido corresponde exclusivamente al proveedor de la plataforma.
 */
@RestController
@RequestMapping("/api/cursos-gratuitos")
@RequiredArgsConstructor
@Tag(name = "Cursos gratuitos", description = "Catálogo educativo de la plataforma")
public class CursoGratuitoController {

    private final CursoGratuitoService cursoService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Catálogo visible para el usuario autenticado")
    public List<CursoGratuitoDto> catalogo() {
        return cursoService.catalogo(CurrentUser.get().getColegioId());
    }

    // ── Gestión: solo el proveedor ───────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Publica un curso en el catálogo global")
    public CursoGratuitoDto crear(@Valid @RequestBody GuardarCursoRequest req) {
        return cursoService.crearCurso(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Actualiza un curso")
    public CursoGratuitoDto actualizar(@PathVariable Long id, @Valid @RequestBody GuardarCursoRequest req) {
        return cursoService.actualizarCurso(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Retira un curso del catálogo")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        cursoService.eliminarCurso(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{cursoId}/categorias")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Agrega un módulo al curso")
    public CursoGratuitoDto crearCategoria(@PathVariable Long cursoId,
                                           @Valid @RequestBody GuardarCategoriaRequest req) {
        return cursoService.crearCategoria(cursoId, req);
    }

    @PutMapping("/{cursoId}/categorias/{categoriaId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Actualiza un módulo")
    public CursoGratuitoDto actualizarCategoria(@PathVariable Long cursoId, @PathVariable Long categoriaId,
                                                @Valid @RequestBody GuardarCategoriaRequest req) {
        return cursoService.actualizarCategoria(cursoId, categoriaId, req);
    }

    @DeleteMapping("/{cursoId}/categorias/{categoriaId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Elimina un módulo y su material")
    public ResponseEntity<Void> eliminarCategoria(@PathVariable Long cursoId, @PathVariable Long categoriaId) {
        cursoService.eliminarCategoria(cursoId, categoriaId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{cursoId}/categorias/{categoriaId}/recursos")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Agrega material a un módulo")
    public CursoGratuitoDto agregarRecurso(@PathVariable Long cursoId, @PathVariable Long categoriaId,
                                           @Valid @RequestBody GuardarRecursoRequest req) {
        return cursoService.agregarRecurso(cursoId, categoriaId, req);
    }

    @PutMapping("/{cursoId}/recursos/{recursoId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Actualiza un material")
    public CursoGratuitoDto actualizarRecurso(@PathVariable Long cursoId, @PathVariable Long recursoId,
                                              @Valid @RequestBody GuardarRecursoRequest req) {
        return cursoService.actualizarRecurso(cursoId, recursoId, req);
    }

    @DeleteMapping("/{cursoId}/recursos/{recursoId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Elimina un material")
    public ResponseEntity<Void> eliminarRecurso(@PathVariable Long cursoId, @PathVariable Long recursoId) {
        cursoService.eliminarRecurso(cursoId, recursoId);
        return ResponseEntity.noContent().build();
    }
}