package com.willay.controller;

import com.willay.dto.QrDinamicoDto;
import com.willay.repository.AlumnoRepository;
import com.willay.service.CredencialService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/credenciales")
@RequiredArgsConstructor
@Tag(name = "Credenciales", description = "Códigos QR de estudiantes")
public class CredencialController {

    private final CredencialService credencialService;
    private final AlumnoRepository alumnoRepository;

    @GetMapping(value = "/alumno/{id}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "QR del estudiante (PNG)")
    public ResponseEntity<byte[]> qr(@PathVariable Long id) {
        verificarAcceso(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePrivate())
                .body(credencialService.qrDeAlumno(CurrentUser.colegioId(), id));
    }

    /**
     * QR de respaldo para cuando el alumno olvida su tarjeta: cambia cada
     * pocos segundos, así que el frontend debe volver a pedirlo antes de
     * que expire (ver expiraEnSegundos). No hay caché: cada respuesta es
     * distinta a propósito.
     */
    @GetMapping("/alumno/{id}/qr-dinamico")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Token de QR dinámico del estudiante (vence en segundos)")
    public QrDinamicoDto qrDinamico(@PathVariable Long id) {
        verificarAcceso(id);
        return credencialService.tokenDinamicoDeAlumno(CurrentUser.colegioId(), id);
    }

    /** El QR de un menor solo lo ve el personal, el propio alumno o su apoderado. */
    private void verificarAcceso(Long alumnoId) {
        var quien = CurrentUser.get();
        switch (quien.getRol()) {
            case ADMIN, DIRECCION, DOCENTE -> { /* personal del colegio */ }
            case ALUMNO -> alumnoRepository.findByUsuarioId(quien.getId())
                    .filter(a -> a.getId().equals(alumnoId))
                    .orElseThrow(() -> new AccessDeniedException("Sin permiso"));
            case APODERADO -> alumnoRepository.hijosDelApoderado(quien.getId()).stream()
                    .filter(a -> a.getId().equals(alumnoId)).findAny()
                    .orElseThrow(() -> new AccessDeniedException("Sin permiso"));
            default -> throw new AccessDeniedException("Sin permiso");
        }
    }
}
