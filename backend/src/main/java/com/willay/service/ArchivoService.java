package com.willay.service;

import com.willay.entity.Alumno;
import com.willay.entity.Archivo;
import com.willay.entity.Rol;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import com.willay.security.UsuarioPrincipal;
import com.willay.util.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Carga y entrega de archivos (fotografías de perfil y material educativo).
 *
 * Se validan el tipo y el tamaño antes de almacenar: aceptar cualquier
 * archivo permitiría subir ejecutables o agotar el disco.
 */
@Service
@RequiredArgsConstructor
public class ArchivoService {

    private static final long TAMANO_MAX_IMAGEN = 5 * 1024 * 1024;     // 5 MB
    private static final long TAMANO_MAX_DOCUMENTO = 25 * 1024 * 1024; // 25 MB
    private static final List<String> IMAGENES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> DOCUMENTOS = List.of(
            "application/pdf", "image/jpeg", "image/png", "image/webp",
            "video/mp4", "application/epub+zip");

    private final ArchivoRepository archivoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlumnoRepository alumnoRepository;
    private final LibretaRepository libretaRepository;

    @Transactional
    public String guardarImagen(Long colegioId, Long usuarioId, MultipartFile archivo) {
        return guardar(colegioId, usuarioId, archivo, IMAGENES, TAMANO_MAX_IMAGEN,
                "Formato no admitido. Usa JPG, PNG o WEBP.");
    }

    @Transactional
    public String guardarDocumento(Long colegioId, Long usuarioId, MultipartFile archivo) {
        return guardar(colegioId, usuarioId, archivo, DOCUMENTOS, TAMANO_MAX_DOCUMENTO,
                "Formato no admitido. Usa PDF, imagen, video MP4 o EPUB.");
    }

    /** Actualiza la foto del usuario autenticado (y del alumno, si lo es). */
    @Transactional
    public String actualizarFotoPerfil(Long colegioId, Long usuarioId, MultipartFile archivo) {
        String url = guardarImagen(colegioId, usuarioId, archivo);
        usuarioRepository.findById(usuarioId).ifPresent(u -> u.setFotoUrl(url));
        alumnoRepository.findByUsuarioId(usuarioId).ifPresent(a -> a.setFotoUrl(url));
        return url;
    }

    @Transactional(readOnly = true)
    public Archivo obtener(UUID uuid) {
        return archivoRepository.findByUuid(uuid)
                .orElseThrow(() -> new NotFoundException("Archivo no encontrado"));
    }

    /** Igual que obtener(), pero exige que el usuario de la sesión actual tenga permiso. */
    @Transactional(readOnly = true)
    public Archivo obtenerConAcceso(UUID uuid) {
        Archivo archivo = obtener(uuid);
        verificarAcceso(archivo);
        return archivo;
    }

    /**
     * Material del catálogo global (colegio_id nulo) es libre para cualquier
     * autenticado. El resto exige mismo colegio y, además, ser personal del
     * colegio, el propio alumno dueño del archivo o su apoderado — mismo
     * patrón que CredencialController.verificarAcceso() para el QR.
     */
    private void verificarAcceso(Archivo archivo) {
        if (archivo.getColegioId() == null) return;

        UsuarioPrincipal quien = CurrentUser.get();
        // El proveedor no pertenece a ningún colegio pero debe poder revisar
        // el archivo de cualquiera (p. ej. el logo, desde su propio panel).
        if (quien.getRol() == Rol.SUPER_ADMIN) return;
        if (!archivo.getColegioId().equals(quien.getColegioId())) {
            throw new AccessDeniedException("Sin permiso");
        }
        // Quien subió el archivo siempre puede verlo (p. ej. su propia foto
        // de perfil): sin esto, alumnoDuenoDe() lo trataría como "sin dueño
        // alumno" y negaría el acceso incluso al propio autor.
        if (archivo.getSubidoPor() != null && archivo.getSubidoPor().equals(quien.getId())) return;

        switch (quien.getRol()) {
            case ADMIN, DIRECCION, DOCENTE -> { /* personal del colegio */ }
            case ALUMNO -> {
                Long propio = alumnoRepository.findByUsuarioId(quien.getId()).map(Alumno::getId).orElse(null);
                if (propio == null || !propio.equals(alumnoDuenoDe(archivo))) {
                    throw new AccessDeniedException("Sin permiso");
                }
            }
            case APODERADO -> {
                Long duenoId = alumnoDuenoDe(archivo);
                boolean esHijo = duenoId != null && alumnoRepository.hijosDelApoderado(quien.getId()).stream()
                        .anyMatch(h -> h.getId().equals(duenoId));
                if (!esHijo) throw new AccessDeniedException("Sin permiso");
            }
            default -> throw new AccessDeniedException("Sin permiso");
        }
    }

    /**
     * A qué alumno pertenece el archivo. Si es la libreta escaneada de un
     * alumno, ese alumno sale de la tabla libreta (alumno_id) — igual que
     * CredencialController resuelve el dueño del QR. Si no es una libreta
     * (foto de perfil), el dueño es quien lo subió: solo el propio alumno
     * sube su foto.
     */
    private Long alumnoDuenoDe(Archivo archivo) {
        return libretaRepository.findByArchivoUuid(archivo.getUuid())
                .map(l -> l.getAlumno().getId())
                .or(() -> alumnoRepository.findByUsuarioId(archivo.getSubidoPor()).map(Alumno::getId))
                .orElse(null);
    }

    private String guardar(Long colegioId, Long usuarioId, MultipartFile archivo,
                           List<String> tiposPermitidos, long tamanoMax, String mensajeTipo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new BusinessException("No se recibió ningún archivo");
        }
        String tipo = archivo.getContentType();
        if (tipo == null || tiposPermitidos.stream().noneMatch(tipo::equalsIgnoreCase)) {
            throw new BusinessException(mensajeTipo);
        }
        if (archivo.getSize() > tamanoMax) {
            throw new BusinessException("El archivo supera el máximo de " + (tamanoMax / 1024 / 1024) + " MB");
        }

        try {
            Archivo a = new Archivo();
            a.setColegioId(colegioId);
            a.setNombreOriginal(archivo.getOriginalFilename() == null ? "archivo" : archivo.getOriginalFilename());
            a.setTipoMime(tipo);
            a.setTamanoBytes(archivo.getSize());
            a.setContenido(archivo.getBytes());
            a.setSubidoPor(usuarioId);
            archivoRepository.save(a);
            return "/api/archivos/" + a.getUuid();
        } catch (IOException e) {
            throw new BusinessException("No se pudo leer el archivo");
        }
    }
}
