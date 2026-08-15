package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Alta y edición de alumno.
 * El código (A-XXXX) NO se recibe: lo genera el sistema para evitar
 * duplicados y trabajo manual durante la matrícula masiva.
 */
public record GuardarAlumnoRequest(
        @NotBlank(message = "Los nombres son obligatorios")
        @Size(max = 120) String nombres,

        @NotBlank(message = "Los apellidos son obligatorios")
        @Size(max = 120) String apellidos,

        @Dni String dni,

        @Past(message = "La fecha de nacimiento debe ser anterior a hoy")
        LocalDate fechaNacimiento,

        @NotNull(message = "Debe asignar un aula") Long aulaId,

        /** Opcional: si viene, se emite o reemplaza la tarjeta activa. */
        @Size(max = 40) String tarjetaRfid
) {}
