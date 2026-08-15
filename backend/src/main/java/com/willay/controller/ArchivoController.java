package com.willay.controller;

import com.willay.entity.Archivo;
import com.willay.security.JwtService;
import com.willay.security.UsuarioPrincipal;
import com.willay.service.ArchivoService;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/archivos")
@RequiredArgsConstructor
@Tag(name = "Archivos", description = "Fotografías de perfil y material educativo")
public class ArchivoController {

    private final ArchivoService archivoService;
    private final JwtService jwtService;

    @PostMapping(value = "/foto-perfil", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Sube y asigna la fotografía de perfil del usuario")
    public Map<String, String> fotoPerfil(@RequestParam("archivo") MultipartFile archivo) {
        return Map.of("url", archivoService.actualizarFotoPerfil(
                CurrentUser.colegioId(), CurrentUser.usuarioId(), archivo));
    }

    @PostMapping(value = "/documento", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','DIRECCION','DOCENTE')")
    @Operation(summary = "Sube un documento o recurso educativo")
    public Map<String, String> documento(@RequestParam("archivo") MultipartFile archivo) {
        return Map.of("url", archivoService.guardarDocumento(
                CurrentUser.colegioId(), CurrentUser.usuarioId(), archivo));
    }

    @GetMapping("/{uuid}/enlace")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Emite un enlace firmado de corta duración para el archivo")
    public Map<String, String> enlace(@PathVariable UUID uuid) {
        archivoService.obtenerConAcceso(uuid);
        String token = jwtService.emitirTokenArchivo(uuid, 5);
        return Map.of("url", "/api/archivos/" + uuid + "?token=" + token);
    }

    /**
     * Descarga por sesión normal (cabecera Authorization) o por enlace
     * firmado (?token=…, de vida corta y específico de este archivo). La
     * ruta está permitida sin sesión en SecurityConfig porque el control de
     * acceso real ocurre aquí: con sesión se verifica colegio/rol; con
     * token, que sea válido y corresponda exactamente a este UUID.
     */
    @GetMapping("/{uuid}")
    @Operation(summary = "Descarga un archivo por su identificador")
    public ResponseEntity<byte[]> descargar(@PathVariable UUID uuid,
                                            @RequestParam(required = false) String token) {
        Archivo a;
        if (haySesion()) {
            a = archivoService.obtenerConAcceso(uuid);
        } else if (token != null && jwtService.tokenArchivoValido(token, uuid)) {
            a = archivoService.obtener(uuid);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // "inline" (no "attachment"): que <img>/<a target=_blank> lo muestren igual que antes.
        // El nombre real con su extensión se lo damos aquí porque es el único lugar que lo conoce
        // con certeza; sin esto, un <a download> del frontend guarda el archivo sin extensión.
        ContentDisposition disposicion = ContentDisposition.inline()
                .filename(a.getNombreOriginal(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getTipoMime()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicion.toString())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .body(a.getContenido());
    }

    private boolean haySesion() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UsuarioPrincipal;
    }
}
