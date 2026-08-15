package com.willay.controller;

import com.willay.dto.AlumnoDto;
import com.willay.dto.GuardarAlumnoRequest;
import com.willay.dto.PaginaDto;
import com.willay.service.AlumnoService;
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
@RequestMapping("/api/alumnos")
@RequiredArgsConstructor
@Tag(name = "Alumnos", description = "Gestión de estudiantes del colegio")
public class AlumnoController {

    private static final int TAMANO_MAX = 200;

    private final AlumnoService alumnoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE','ALUMNO','APODERADO')")
    @Operation(summary = "Lista estudiantes según el alcance del rol autenticado")
    public PaginaDto<AlumnoDto> listar(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano) {
        return alumnoService.listar(CurrentUser.get(), q,
                PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamano, 1), TAMANO_MAX)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION','DOCENTE','ALUMNO','APODERADO')")
    @Operation(summary = "Detalle de un estudiante")
    public AlumnoDto porId(@PathVariable Long id) {
        return alumnoService.porId(CurrentUser.get(), id);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Registra un estudiante; el código se genera automáticamente")
    public AlumnoDto crear(@Valid @RequestBody GuardarAlumnoRequest req, HttpServletRequest http) {
        return alumnoService.crear(CurrentUser.get(), req, http.getRemoteAddr());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Actualiza los datos de un estudiante")
    public AlumnoDto actualizar(@PathVariable Long id,
                                @Valid @RequestBody GuardarAlumnoRequest req,
                                HttpServletRequest http) {
        return alumnoService.actualizar(CurrentUser.get(), id, req, http.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Da de baja al estudiante (baja lógica: conserva su historial)")
    public ResponseEntity<Void> retirar(@PathVariable Long id, HttpServletRequest http) {
        alumnoService.retirar(CurrentUser.get(), id, http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
