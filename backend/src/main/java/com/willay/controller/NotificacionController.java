package com.willay.controller;

import com.willay.dto.NotificacionDto;
import com.willay.service.NotificacionService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Notificaciones", description = "Avisos personales del usuario")
public class NotificacionController {

    private final NotificacionService notificacionService;

    @GetMapping
    @Operation(summary = "Últimas notificaciones del usuario, con filtro de tipo(s) opcional")
    public List<NotificacionDto> listar(@RequestParam(required = false) List<String> tipo) {
        return notificacionService.listar(CurrentUser.usuarioId(), tipo);
    }

    @GetMapping("/sin-leer")
    @Operation(summary = "Cantidad de notificaciones sin leer")
    public Map<String, Long> sinLeer() {
        return Map.of("total", notificacionService.sinLeer(CurrentUser.usuarioId()));
    }

    @PostMapping("/leer-todas")
    @Operation(summary = "Marca todas como leídas")
    public ResponseEntity<Void> leerTodas() {
        notificacionService.marcarTodasLeidas(CurrentUser.usuarioId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/leida")
    @Operation(summary = "Marca una sola notificación como leída (debe pertenecer al usuario autenticado)")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        notificacionService.marcarLeida(CurrentUser.usuarioId(), id);
        return ResponseEntity.noContent().build();
    }
}
