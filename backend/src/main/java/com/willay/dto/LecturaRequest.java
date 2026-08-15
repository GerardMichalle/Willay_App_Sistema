package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Petición que envía el lector físico en cada pasada de tarjeta.
 * El dispositivo se identifica con su api-key en la cabecera X-Api-Key.
 */
public record LecturaRequest(
        @NotBlank(message = "El código de tarjeta es obligatorio")
        @Size(max = 40) String tarjeta,

        /** RFID (por defecto), QR o MANUAL. */
        String metodo,

        /** Opcional: si el lector conoce el sentido, lo impone. */
        String tipo
) {}
