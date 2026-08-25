package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record CrearNotaInternaRequest(
        @NotBlank(message = "Escribe el contenido de la nota") String contenido
) {}
