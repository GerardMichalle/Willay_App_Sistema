package com.willay.controller;

import com.willay.dto.GuardarLibretaRequest;
import com.willay.dto.LibretaDto;
import com.willay.dto.SubirLibretaRequest;
import com.willay.repository.DocenteAulaRepository;
import com.willay.service.LibretaService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/libretas")
@RequiredArgsConstructor
@Tag(name = "Libretas", description = "Notas por periodo y publicación a las familias")
public class LibretaController {

    private final LibretaService libretaService;
    private final DocenteAulaRepository docenteAulaRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Libretas visibles según el rol; las no publicadas solo las ve el docente")
    public List<LibretaDto> listar(@RequestParam(required = false) Long alumnoId,
                                   @RequestParam(required = false) Integer anio) {
        return libretaService.listar(CurrentUser.get(), alumnoId, anio);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    @Operation(summary = "Guarda o publica la libreta de un estudiante")
    public LibretaDto guardar(@Valid @RequestBody GuardarLibretaRequest req) {
        return libretaService.guardar(CurrentUser.get(), req);
    }

    @PostMapping("/escaneada")
    @PreAuthorize("hasAnyRole('ADMIN','DOCENTE')")
    @Operation(summary = "Publica la libreta como documento escaneado (PDF o imagen)")
    public LibretaDto subirEscaneada(@Valid @RequestBody SubirLibretaRequest req) {
        return libretaService.subirEscaneada(CurrentUser.get(), req);
    }

    @GetMapping("/aulas-tutoria")
    @PreAuthorize("hasRole('DOCENTE')")
    @Operation(summary = "Aulas donde el docente autenticado es tutor (quien puede publicar la libreta)")
    public List<Long> aulasTutoria() {
        return docenteAulaRepository.aulasDondeEsTutor(CurrentUser.usuarioId());
    }
}
