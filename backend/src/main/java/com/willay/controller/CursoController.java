package com.willay.controller;

import com.willay.entity.Curso;
import com.willay.repository.CursoRepository;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cursos")
@RequiredArgsConstructor
@Tag(name = "Cursos", description = "Cursos del plan de estudios")
public class CursoController {

    private final CursoRepository cursoRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cursos activos del colegio")
    public List<Map<String, Object>> listar() {
        return cursoRepository.findByColegioIdAndActivoTrueOrderByNombreAsc(CurrentUser.colegioId())
                .stream()
                .map(c -> Map.<String, Object>of(
                        "id", c.getId(),
                        "nombre", c.getNombre(),
                        "abreviatura", c.getAbreviatura() == null ? "" : c.getAbreviatura()))
                .toList();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Registra un curso del plan de estudios")
    public Map<String, Object> crear(@RequestBody Map<String, String> body) {
        Curso c = new Curso();
        c.setColegio(new com.willay.entity.Colegio());
        c.getColegio().setId(CurrentUser.colegioId());
        c.setNombre(body.getOrDefault("nombre", "").trim());
        c.setAbreviatura(body.get("abreviatura"));
        cursoRepository.save(c);
        return Map.of("id", c.getId(), "nombre", c.getNombre());
    }
}
