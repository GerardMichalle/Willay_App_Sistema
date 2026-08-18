package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Crea la cuenta web de un estudiante ya matriculado que no la tiene.
 * dni es opcional: solo hace falta si el estudiante todavía no lo tiene
 * registrado (el backend lo exige para poder emitir el código).
 */
public record CrearCuentaAlumnoRequest(
        @NotBlank(message = "El correo es obligatorio") @Email(message = "Correo del estudiante inválido") String correo,
        @Dni String dni
) {}
