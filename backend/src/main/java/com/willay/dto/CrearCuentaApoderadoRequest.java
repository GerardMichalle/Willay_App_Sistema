package com.willay.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Crea la cuenta web de un apoderado ya vinculado que no la tiene (correo no dado en la matrícula). */
public record CrearCuentaApoderadoRequest(
        @NotBlank(message = "El correo es obligatorio") @Email(message = "Correo del apoderado inválido") String correo
) {}
