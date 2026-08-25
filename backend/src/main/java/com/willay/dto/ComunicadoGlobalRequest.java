package com.willay.dto;

import jakarta.validation.constraints.NotBlank;

public record ComunicadoGlobalRequest(
        @NotBlank(message = "Escribe un título") String titulo,
        @NotBlank(message = "Escribe el mensaje") String mensaje
) {}
