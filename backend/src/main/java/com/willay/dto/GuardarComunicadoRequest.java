package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record GuardarComunicadoRequest(
        @NotBlank(message = "El título es obligatorio") @Size(max = 200) String titulo,
        @NotBlank(message = "El contenido es obligatorio") String cuerpo,
        @Pattern(regexp = "TODOS|APODERADOS|DOCENTES|ALUMNOS", message = "Destinatario inválido")
        String dirigidoA,
        /** NULL = todo el colegio. */
        Long aulaId,
        /** Si es true se publica de inmediato; si no, queda como borrador. */
        boolean publicar
) {}
