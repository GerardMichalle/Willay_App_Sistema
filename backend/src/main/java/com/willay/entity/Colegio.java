package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "colegio")
@Getter @Setter
public class Colegio extends EntidadBase {
    @Column(nullable = false, length = 160)
    private String nombre;

    @Column(name = "codigo_modular", length = 20)
    private String codigoModular;

    @Column(length = 11)
    private String ruc;

    @Column(name = "logo_url", length = 400)
    private String logoUrl;

    @Column(name = "color_marca", length = 9)
    private String colorMarca;

    @Column(nullable = false)
    private boolean activo = true;

    /** AL_DIA, PENDIENTE o VENCIDO — validado en el DTO, no aquí (ver ActualizarPagoRequest). */
    @Column(name = "estado_pago", nullable = false, length = 20)
    private String estadoPago = "AL_DIA";

    @Column(name = "proximo_vencimiento")
    private LocalDate proximoVencimiento;
}
