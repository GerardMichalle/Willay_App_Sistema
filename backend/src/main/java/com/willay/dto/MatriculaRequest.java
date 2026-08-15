package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

/**
 * Matrícula: da de alta al estudiante y a su apoderado en un solo acto,
 * replicando la ficha que la secretaría ya llena en papel.
 */
public record MatriculaRequest(
        @Valid @NotNull DatosAlumno alumno,
        @Valid @NotNull DatosApoderado apoderado
) {
    public record DatosAlumno(
            @NotBlank(message = "Los nombres del estudiante son obligatorios") @Size(max = 120) String nombres,
            @NotBlank(message = "Los apellidos del estudiante son obligatorios") @Size(max = 120) String apellidos,
            @Dni String dni,
            @Past(message = "La fecha de nacimiento debe ser anterior a hoy") LocalDate fechaNacimiento,
            @NotNull(message = "Debe asignar un aula") Long aulaId,
            @Size(max = 40) String tarjetaRfid,
            /** Si es true, se crea también la cuenta web del estudiante. */
            boolean crearCuenta,
            @Email(message = "Correo del estudiante inválido") String correo
    ) {}

    public record DatosApoderado(
            @NotBlank(message = "Los nombres del apoderado son obligatorios") @Size(max = 120) String nombres,
            @NotBlank(message = "Los apellidos del apoderado son obligatorios") @Size(max = 120) String apellidos,
            @NotBlank(message = "El DNI del apoderado es obligatorio") @Dni String dni,
            @Size(max = 20) String telefono,
            @Email(message = "Correo del apoderado inválido") String correo,
            @Size(max = 20) String parentesco
    ) {}
}
