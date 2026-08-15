package com.willay.service;

import com.willay.dto.PuntoAccesoDto;
import com.willay.entity.PuntoAcceso;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.ColegioRepository;
import com.willay.repository.PuntoAccesoRepository;
import com.willay.repository.SedeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

/**
 * Lectores instalados en las puertas.
 *
 * Cada dispositivo recibe una credencial propia que se muestra UNA sola
 * vez, al crearla o regenerarla: en la base solo queda su hash. Si un
 * lector se extravía, se regenera su clave y el anterior deja de servir
 * sin afectar a los demás.
 */
@Service
@RequiredArgsConstructor
public class PuntoAccesoService {

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd MMM HH:mm");
    private static final SecureRandom ALEATORIO = new SecureRandom();
    private static final int MINUTOS_EN_LINEA = 5;

    private final PuntoAccesoRepository puntoAccesoRepository;
    private final SedeRepository sedeRepository;
    private final ColegioRepository colegioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<PuntoAccesoDto> listar(Long colegioId) {
        return puntoAccesoRepository.findByColegioIdAndActivoTrue(colegioId)
                .stream().map(p -> aDto(p, null)).toList();
    }

    @Transactional
    public PuntoAccesoDto crear(Long colegioId, String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new BusinessException("El nombre del lector es obligatorio");
        }
        Long sedeId = sedeRepository.findFirstByColegioIdAndActivoTrue(colegioId)
                .orElseThrow(() -> new BusinessException("El colegio no tiene sede registrada"))
                .getId();

        String clave = generarClave();
        PuntoAcceso p = new PuntoAcceso();
        p.setColegio(colegioRepository.getReferenceById(colegioId));
        p.setSede(sedeRepository.getReferenceById(sedeId));
        p.setNombre(nombre.trim());
        p.setApiKeyHash(passwordEncoder.encode(clave));
        p.setActivo(true);
        puntoAccesoRepository.save(p);

        return aDto(p, clave);   // única vez que la clave viaja en claro
    }

    @Transactional
    public PuntoAccesoDto regenerarClave(Long colegioId, Long id) {
        PuntoAcceso p = buscar(colegioId, id);
        String clave = generarClave();
        p.setApiKeyHash(passwordEncoder.encode(clave));
        return aDto(p, clave);
    }

    @Transactional
    public void desactivar(Long colegioId, Long id) {
        buscar(colegioId, id).setActivo(false);
    }

    private PuntoAcceso buscar(Long colegioId, Long id) {
        return puntoAccesoRepository.findById(id)
                .filter(p -> p.getColegio().getId().equals(colegioId))
                .orElseThrow(() -> new NotFoundException("Lector no encontrado"));
    }

    private String generarClave() {
        byte[] bytes = new byte[24];
        ALEATORIO.nextBytes(bytes);
        return "wly_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private PuntoAccesoDto aDto(PuntoAcceso p, String claveNueva) {
        boolean enLinea = p.getUltimoLatido() != null
                && Duration.between(p.getUltimoLatido(), OffsetDateTime.now()).toMinutes() < MINUTOS_EN_LINEA;
        return new PuntoAccesoDto(p.getId(), p.getNombre(), p.isActivo(), enLinea,
                p.getUltimoLatido() != null ? p.getUltimoLatido().format(FECHA) : null, claveNueva);
    }
}
