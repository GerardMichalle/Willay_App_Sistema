package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Curso del plan de estudios (distinto de CursoGratuito). */
@Entity
@Table(name = "curso")
@Getter @Setter
public class Curso extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 20)
    private String abreviatura;

    @Column(nullable = false)
    private boolean activo = true;
}
