package com.willay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Vinculación rápida desde la pantalla "Vincular tarjetas": el UID ya viene detectado por el lector. */
public record VincularTarjetaRequest(
        @NotBlank(message = "Falta el UID de la tarjeta") @Size(max = 40) String uid
) {}
