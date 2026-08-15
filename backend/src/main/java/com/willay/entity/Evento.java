package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "evento")
@Getter @Setter
public class Evento extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, length = 15)
    private String tipo;

    @Column(nullable = false)
    private LocalDate fecha;

    private LocalTime hora;

    @Column(length = 160)
    private String lugar;
}
