package com.willay.controller;

import com.willay.dto.ApoderadoDto;
import com.willay.service.ApoderadoService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
