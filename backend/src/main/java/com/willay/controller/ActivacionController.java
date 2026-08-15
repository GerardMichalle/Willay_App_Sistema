package com.willay.controller;

import com.willay.dto.CompletarActivacionRequest;
import com.willay.dto.IdentidadActivacionDto;
import com.willay.dto.VerificarActivacionRequest;
import com.willay.service.ActivacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/activacion")
@RequiredArgsConstructor
@Tag(name = "Activación de cuenta",
     description = "Flujo de dos pasos para alumnos y apoderados con código de matrícula")
public class ActivacionController {

    private final ActivacionService activacionService;

    @PostMapping("/verificar")
    @Operation(summary = "Paso 1: valida código + DNI y revela la identidad y el vínculo")
    public IdentidadActivacionDto verificar(@Valid @RequestBody VerificarActivacionRequest peticion) {
        return activacionService.verificar(peticion);
    }

    @PostMapping("/completar")
    @Operation(summary = "Paso 2: establece la contraseña y activa la cuenta")
    public IdentidadActivacionDto completar(@Valid @RequestBody CompletarActivacionRequest peticion,
                                            HttpServletRequest req) {
        return activacionService.completar(peticion, req.getRemoteAddr());
    }
}
