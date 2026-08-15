package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** Asignación docente-aula. Es la base del filtro "solo mi aula". */
@Entity
@Table(name = "docente_aula")
@Getter @Setter
public class DocenteAula {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "colegio_id", nullable = false)
    private Long colegioId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "docente_id")
    private Docente docente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aula_id")
    private Aula aula;

    @Column(name = "es_tutor", nullable = false)
    private boolean esTutor;
}
