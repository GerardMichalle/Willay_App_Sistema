package com.willay.dto;

import com.willay.validation.Dni;
import jakarta.validation.constraints.*;

/**
 * Alta de un colegio cliente: crea la institución, su sede principal y la
 * cuenta del administrador en un solo acto. Es lo que ocurre el día que
 * un colegio firma el contrato.
 */
public record CrearColegioRequest(
        @NotBlank(message = "El nombre del colegio es obligatorio") @Size(max = 160) String nombre,
        @Size(max = 20) String codigoModular,
        @Size(max = 11) String ruc,
        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Color inválido (formato #RRGGBB)") String colorMarca,

        @NotBlank(message = "El nombre de la sede es obligatorio") @Size(max = 120) String sedeNombre,
        @Size(max = 240) String sedeDireccion,

        @NotBlank(message = "Los nombres del administrador son obligatorios") String adminNombres,
        @NotBlank(message = "Los apellidos del administrador son obligatorios") String adminApellidos,
        @NotBlank(message = "El correo del administrador es obligatorio")
        @Email(message = "Correo inválido") String adminCorreo,
        @Dni String adminDni,
        @Size(max = 20) String adminTelefono,
        @NotBlank @Size(min = 8, message = "La contraseña temporal debe tener al menos 8 caracteres")
        String adminPasswordTemporal
) {}
