package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GuardarDocenteRequest(
        @NotBlank(message = "Los nombres son obligatorios") @Size(max = 120) String nombres,
        @NotBlank(message = "Los apellidos son obligatorios") @Size(max = 120) String apellidos,
        @NotBlank(message = "El correo es obligatorio") @Email(message = "Correo inválido") String correo,
        @Dni String dni,
        @Size(max = 20) String telefono,
        @Size(max = 120) String especialidad,
        /** Aulas asignadas; la primera puede marcarse como tutoría. */
        List<Long> aulaIds,
        Long aulaTutoriaId
) {}
