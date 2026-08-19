package com.willay.controller;

import com.willay.dto.*;
import com.willay.mapper.UsuarioMapper;
import com.willay.repository.UsuarioRepository;
import com.willay.service.AuthService;
import com.willay.service.RecuperacionService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Login, refresco de sesión y cierre de sesión")
public class AuthController {

    private final AuthService authService;
    private final RecuperacionService recuperacionService;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;

    @PostMapping("/login")
    @Operation(summary = "Inicia sesión y devuelve access + refresh token")
    public TokenResponse login(@Valid @RequestBody LoginRequest peticion, HttpServletRequest req) {
        return authService.login(peticion, req.getRemoteAddr());
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rota el refresh token y emite un nuevo access token")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest peticion, HttpServletRequest req) {
        return authService.refrescar(peticion.refreshToken(), req.getRemoteAddr());
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoca todos los refresh tokens del usuario autenticado")
    public ResponseEntity<Void> logout(HttpServletRequest req) {
        authService.logout(CurrentUser.usuarioId(), req.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/yo")
    @Operation(summary = "Devuelve el perfil del usuario autenticado")
    public UsuarioDto yo() {
        return usuarioRepository.findById(CurrentUser.usuarioId())
                .map(usuarioMapper::aDto)
                .orElseThrow();
    }

    @PutMapping("/password")
    @Operation(summary = "Cambia la contraseña del usuario autenticado")
    public ResponseEntity<Void> cambiarPassword(@Valid @RequestBody CambiarPasswordRequest peticion, HttpServletRequest req) {
        authService.cambiarPassword(CurrentUser.usuarioId(), peticion, req.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recuperar/solicitar")
    @Operation(summary = "Envía un código de recuperación al correo si la cuenta existe (respuesta siempre genérica)")
    public ResponseEntity<Void> solicitarRecuperacion(@Valid @RequestBody SolicitarRecuperacionRequest peticion, HttpServletRequest req) {
        recuperacionService.solicitar(peticion.correo(), req.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recuperar/completar")
    @Operation(summary = "Valida el código de recuperación y establece la nueva contraseña")
    public ResponseEntity<Void> completarRecuperacion(@Valid @RequestBody CompletarRecuperacionRequest peticion, HttpServletRequest req) {
        recuperacionService.completar(peticion.correo(), peticion.codigo(), peticion.passwordNueva(), req.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
