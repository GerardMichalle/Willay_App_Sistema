package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** Evento crudo del lector: cada pasada de tarjeta genera una fila. */
@Entity
@Table(name = "registro_acceso")
@Getter @Setter
public class RegistroAcceso extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alumno_id")
    private Alumno alumno;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "punto_acceso_id")
    private PuntoAcceso puntoAcceso;

    @Column(name = "tarjeta_codigo", length = 40)
    private String tarjetaCodigo;

    @Column(nullable = false, length = 10)
    private String metodo = "RFID";

    @Column(nullable = false, length = 10)
    private String tipo;

    @Column(nullable = false)
    private OffsetDateTime momento = OffsetDateTime.now();
}
