package com.willay.controller;

import com.willay.dto.ClavePublicaPushDto;
import com.willay.dto.DesuscribirPushRequest;
import com.willay.dto.SuscribirPushRequest;
import com.willay.service.PushNotificacionService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
@Tag(name = "Notificaciones push", description = "Suscripción del navegador a notificaciones del sistema operativo (Web Push / VAPID)")
public class PushController {

    private final PushNotificacionService pushService;

    @GetMapping("/clave-publica")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Clave pública VAPID que el navegador necesita para suscribirse")
    public ClavePublicaPushDto clavePublica() {
        return new ClavePublicaPushDto(pushService.clavePublica());
    }

    @PostMapping("/suscribir")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Registra la suscripción push del navegador actual para el usuario autenticado")
    public ResponseEntity<Void> suscribir(@Valid @RequestBody SuscribirPushRequest req) {
        pushService.suscribir(CurrentUser.usuarioId(), req.endpoint(), req.keys().p256dh(), req.keys().auth());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/suscribir")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Elimina una suscripción push (al desactivar notificaciones en ese navegador)")
    public ResponseEntity<Void> desuscribir(@Valid @RequestBody DesuscribirPushRequest req) {
        pushService.desuscribir(CurrentUser.usuarioId(), req.endpoint());
        return ResponseEntity.noContent().build();
    }
}
