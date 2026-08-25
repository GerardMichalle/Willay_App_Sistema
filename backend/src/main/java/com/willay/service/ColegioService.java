package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.ActualizarPagoRequest;
import com.willay.dto.ChecklistColegioDto;
import com.willay.dto.ColegioDto;
import com.willay.dto.ComunicadoGlobalDto;
import com.willay.dto.ComunicadoGlobalRequest;
import com.willay.dto.CrearColegioRequest;
import com.willay.dto.CrearNotaInternaRequest;
import com.willay.dto.MetricasColegioDto;
import com.willay.dto.NotaInternaDto;
import com.willay.entity.*;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Administración de instituciones cliente (solo SUPER_ADMIN).
 *
 * Este servicio es el que hace posible el modelo SaaS: vender a un colegio
 * nuevo no requiere desplegar nada, solo crear su registro. Todos comparten
 * la misma instancia y sus datos quedan aislados por colegio_id.
 */
@Service
@RequiredArgsConstructor
public class ColegioService {

    private final ColegioRepository colegioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final AlumnoRepository alumnoRepository;
    private final DocenteRepository docenteRepository;
    private final ApoderadoRepository apoderadoRepository;
    private final AulaRepository aulaRepository;
    private final TarjetaRfidRepository tarjetaRfidRepository;
    private final PuntoAccesoRepository puntoAccesoRepository;
    private final ComunicadoRepository comunicadoRepository;
    private final RegistroAccesoRepository registroAccesoRepository;
    private final NotaInternaRepository notaInternaRepository;
    private final ComunicadoGlobalRepository comunicadoGlobalRepository;
    private final NotificacionService notificacionService;
    private final ArchivoService archivoService;
    private final PasswordEncoder passwordEncoder;
    private final AuditoriaService auditoria;

    @Transactional(readOnly = true)
    public List<ColegioDto> listar() {
        return colegioRepository.findAll().stream().map(this::aDto).toList();
    }

    /** Avance de implementación: qué le falta configurar a un colegio cliente. */
    @Transactional(readOnly = true)
    public ChecklistColegioDto checklist(Long colegioId) {
        exigirExiste(colegioId);
        return new ChecklistColegioDto(
                aulaRepository.countByColegioIdAndActivoTrue(colegioId),
                docenteRepository.countByColegioId(colegioId),
                alumnoRepository.countByColegioIdAndEstado(colegioId, "MATRICULADO"),
                tarjetaRfidRepository.countByColegioIdAndEstado(colegioId, "ACTIVA"),
                apoderadoRepository.contarConCuentaActiva(colegioId),
                puntoAccesoRepository.countByColegioId(colegioId),
                comunicadoRepository.existsByColegioIdAndPublicadoEnIsNotNull(colegioId));
    }

    /** Actividad reciente: para detectar colegios que dejaron de usar el sistema. */
    @Transactional(readOnly = true)
    public MetricasColegioDto metricas(Long colegioId) {
        exigirExiste(colegioId);
        OffsetDateTime desde = OffsetDateTime.now().minusDays(7);
        OffsetDateTime ultimaActividad = registroAccesoRepository.findTopByColegioIdOrderByMomentoDesc(colegioId)
                .map(RegistroAcceso::getMomento)
                .orElse(null);
        return new MetricasColegioDto(
                registroAccesoRepository.countByColegioIdAndMomentoAfter(colegioId, desde),
                comunicadoRepository.countByColegioIdAndPublicadoEnIsNotNull(colegioId),
                ultimaActividad);
    }

    /** Bitácora del proveedor sobre el colegio: contacto, vencimiento de contrato, incidencias. */
    @Transactional(readOnly = true)
    public List<NotaInternaDto> listarNotas(Long colegioId) {
        exigirExiste(colegioId);
        return notaInternaRepository.listarDelColegio(colegioId).stream().map(this::aDto).toList();
    }

    @Transactional
    public NotaInternaDto crearNota(Long colegioId, Long autorId, CrearNotaInternaRequest req) {
        Colegio colegio = colegioRepository.findById(colegioId)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));
        Usuario autor = usuarioRepository.getReferenceById(autorId);

        NotaInterna nota = new NotaInterna();
        nota.setColegio(colegio);
        nota.setAutor(autor);
        nota.setContenido(req.contenido().trim());
        notaInternaRepository.save(nota);

        // El autor real ya se conoce en memoria: no hace falta releerlo de la base para el DTO.
        return new NotaInternaDto(nota.getId(), nota.getContenido(), autor.nombreCompleto(), nota.getCreadoEn());
    }

    @Transactional
    public void eliminarNota(Long colegioId, Long notaId) {
        NotaInterna nota = notaInternaRepository.findByIdAndColegioId(notaId, colegioId)
                .orElseThrow(() -> new NotFoundException("Nota no encontrada"));
        notaInternaRepository.delete(nota);
    }

    private NotaInternaDto aDto(NotaInterna n) {
        return new NotaInternaDto(n.getId(), n.getContenido(), n.getAutor().nombreCompleto(), n.getCreadoEn());
    }

    private void exigirExiste(Long colegioId) {
        if (!colegioRepository.existsById(colegioId)) {
            throw new NotFoundException("Colegio no encontrado");
        }
    }

    @Transactional
    public ColegioDto crear(Long autorId, CrearColegioRequest req, String ip) {
        String correo = req.adminCorreo().trim().toLowerCase();
        if (usuarioRepository.existsByCorreoIgnoreCase(correo)) {
            throw new BusinessException("Ya existe una cuenta con el correo " + correo);
        }

        Colegio colegio = new Colegio();
        colegio.setNombre(req.nombre().trim());
        colegio.setCodigoModular(nulo(req.codigoModular()));
        colegio.setRuc(nulo(req.ruc()));
        colegio.setColorMarca(req.colorMarca() == null || req.colorMarca().isBlank()
                ? "#E02D2D" : req.colorMarca());
        colegio.setActivo(true);
        colegioRepository.save(colegio);

        Sede sede = new Sede();
        sede.setColegio(colegio);
        sede.setNombre(req.sedeNombre().trim());
        sede.setDireccion(nulo(req.sedeDireccion()));
        sede.setActivo(true);
        sedeRepository.save(sede);

        // Cuenta de administración: contraseña temporal que deberá cambiar
        Usuario admin = new Usuario();
        admin.setColegio(colegio);
        admin.setCorreo(correo);
        admin.setClaveHash(passwordEncoder.encode(req.adminPasswordTemporal()));
        admin.setRol(Rol.ADMIN);
        admin.setNombres(req.adminNombres().trim());
        admin.setApellidos(req.adminApellidos().trim());
        admin.setDni(nulo(req.adminDni()));
        admin.setTelefono(nulo(req.adminTelefono()));
        admin.setEstado(EstadoUsuario.ACTIVO);
        usuarioRepository.save(admin);

        auditoria.registrar(AccionAuditoria.COLEGIO_CREADO, colegio.getId(), autorId,
                colegio.getNombre() + " · admin " + correo, ip);
        return aDto(colegio);
    }

    /**
     * Suspende o reactiva un colegio.
     * Un colegio suspendido (por impago, por ejemplo) conserva TODOS sus
     * datos; solo se bloquea el acceso de sus usuarios.
     */
    @Transactional
    public ColegioDto cambiarEstado(Long autorId, Long id, boolean activo, String ip) {
        Colegio colegio = colegioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));
        colegio.setActivo(activo);

        auditoria.registrar(AccionAuditoria.COLEGIO_ESTADO_CAMBIADO, id, autorId,
                colegio.getNombre() + " → " + (activo ? "ACTIVO" : "SUSPENDIDO"), ip);
        return aDto(colegio);
    }

    /** Registro manual: no hay cobro real involucrado, solo el estado que anota el proveedor. */
    @Transactional
    public ColegioDto actualizarPago(Long autorId, Long id, ActualizarPagoRequest req, String ip) {
        Colegio colegio = colegioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));
        colegio.setEstadoPago(req.estadoPago());
        colegio.setProximoVencimiento(req.proximoVencimiento());

        auditoria.registrar(AccionAuditoria.COLEGIO_PAGO_ACTUALIZADO, id, autorId,
                colegio.getNombre() + " → " + req.estadoPago(), ip);
        return aDto(colegio);
    }

    /** Insignia del colegio: visible en grande en este panel y en pequeño en el Sidebar de sus usuarios. */
    @Transactional
    public ColegioDto actualizarLogo(Long autorId, Long id, MultipartFile archivo, String ip) {
        Colegio colegio = colegioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Colegio no encontrado"));
        String url = archivoService.guardarImagen(id, autorId, archivo);
        colegio.setLogoUrl(url);

        auditoria.registrar(AccionAuditoria.COLEGIO_LOGO_ACTUALIZADO, id, autorId, colegio.getNombre(), ip);
        return aDto(colegio);
    }

    /**
     * Avisa a todos los administradores de todos los colegios activos a la
     * vez (mantenimiento programado, función nueva, etc.) — sin entrar
     * colegio por colegio. Reutiliza NotificacionService: cada admin la ve
     * en su campana y, si tiene notificaciones push activadas, también le
     * llega como notificación del sistema.
     */
    @Transactional
    public int enviarComunicadoGlobal(Long autorId, ComunicadoGlobalRequest req, String ip) {
        List<Usuario> admins = usuarioRepository.findByRolAndColegio_ActivoTrue(Rol.ADMIN);
        admins.forEach(admin -> notificacionService.crear(admin, "COMUNICADO", req.titulo(), req.mensaje()));

        ComunicadoGlobal cg = new ComunicadoGlobal();
        cg.setTitulo(req.titulo());
        cg.setMensaje(req.mensaje());
        cg.setAutor(usuarioRepository.getReferenceById(autorId));
        cg.setDestinatarios(admins.size());
        comunicadoGlobalRepository.save(cg);

        auditoria.registrar(AccionAuditoria.COMUNICADO_GLOBAL_ENVIADO, null, autorId,
                req.titulo() + " → " + admins.size() + " administradores", ip);
        return admins.size();
    }

    /** Historial de avisos que el proveedor envió a los administradores de todos los colegios. */
    @Transactional(readOnly = true)
    public List<ComunicadoGlobalDto> listarComunicadosGlobales() {
        return comunicadoGlobalRepository.listarTodos().stream()
                .map(c -> new ComunicadoGlobalDto(c.getId(), c.getTitulo(), c.getMensaje(),
                        c.getAutor().nombreCompleto(), c.getDestinatarios(), c.getCreadoEn()))
                .toList();
    }

    private ColegioDto aDto(Colegio c) {
        return new ColegioDto(
                c.getId(), c.getNombre(), c.getCodigoModular(), c.getRuc(), c.getColorMarca(), c.getLogoUrl(),
                c.isActivo(),
                alumnoRepository.countByColegioIdAndEstado(c.getId(), "MATRICULADO"),
                docenteRepository.countByColegioId(c.getId()),
                apoderadoRepository.countByColegioId(c.getId()),
                usuarioRepository.countByColegioIdAndEstado(c.getId(), EstadoUsuario.ACTIVO),
                c.getCreadoEn(), c.getEstadoPago(), c.getProximoVencimiento());
    }

    private String nulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }
}
