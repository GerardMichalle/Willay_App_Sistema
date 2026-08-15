package com.willay.controller;

import com.willay.entity.ConfiguracionColegio;
import com.willay.repository.ColegioRepository;
import com.willay.repository.ConfiguracionRepository;
import com.willay.util.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Parámetros del colegio (hora de tolerancia, canal de avisos, año escolar).
 * Se modelan como pares clave-valor para poder incorporar parámetros nuevos
 * sin modificar el esquema de la base de datos.
 */
@RestController
@RequestMapping("/api/configuracion")
@RequiredArgsConstructor
@Tag(name = "Configuración", description = "Parámetros institucionales")
public class ConfiguracionController {

    private final ConfiguracionRepository configuracionRepository;
    private final ColegioRepository colegioRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECCION')")
    @Operation(summary = "Parámetros actuales del colegio")
    public Map<String, Object> obtener() {
        Map<String, Object> salida = new LinkedHashMap<>();
        configuracionRepository.findByColegioIdOrderByClaveAsc(CurrentUser.colegioId())
                .forEach(c -> salida.put(c.getClave(), c.getValor()));

        colegioRepository.findById(CurrentUser.colegioId()).ifPresent(col -> {
            salida.put("COLEGIO_NOMBRE", col.getNombre());
            salida.put("COLEGIO_CODIGO_MODULAR", col.getCodigoModular() == null ? "" : col.getCodigoModular());
            salida.put("COLEGIO_RUC", col.getRuc() == null ? "" : col.getRuc());
            salida.put("COLEGIO_COLOR", col.getColorMarca() == null ? "#E02D2D" : col.getColorMarca());
        });
        return salida;
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    @Operation(summary = "Actualiza los parámetros enviados")
    public Map<String, Object> actualizar(@RequestBody Map<String, String> cambios) {
        Long colegioId = CurrentUser.colegioId();

        cambios.forEach((clave, valor) -> {
            if (clave.startsWith("COLEGIO_")) {
                colegioRepository.findById(colegioId).ifPresent(col -> {
                    switch (clave) {
                        case "COLEGIO_NOMBRE" -> col.setNombre(valor);
                        case "COLEGIO_CODIGO_MODULAR" -> col.setCodigoModular(valor);
                        case "COLEGIO_RUC" -> col.setRuc(valor);
                        case "COLEGIO_COLOR" -> col.setColorMarca(valor);
                        default -> { }
                    }
                });
                return;
            }
            ConfiguracionColegio c = configuracionRepository
                    .findByColegioIdAndClave(colegioId, clave)
                    .orElseGet(() -> {
                        ConfiguracionColegio nueva = new ConfiguracionColegio();
                        nueva.setColegioId(colegioId);
                        nueva.setClave(clave);
                        return nueva;
                    });
            c.setValor(valor);
            c.setActualizadoEn(OffsetDateTime.now());
            configuracionRepository.save(c);
        });

        return obtener();
    }
}
