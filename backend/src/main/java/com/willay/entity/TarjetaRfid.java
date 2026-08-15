package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "tarjeta_rfid")
@Getter @Setter
public class TarjetaRfid extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alumno_id")
    private Alumno alumno;

    @Column(nullable = false, length = 40)
    private String codigo;

    @Column(nullable = false, length = 15)
    private String estado = "ACTIVA";

    @Column(name = "emitida_en", nullable = false)
    private LocalDate emitidaEn = LocalDate.now();
}
