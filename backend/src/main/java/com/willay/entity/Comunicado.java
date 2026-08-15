package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "comunicado")
@Getter @Setter
public class Comunicado extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id")
    private Usuario autor;

    /** NULL = dirigido a todo el colegio. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aula_id")
    private Aula aula;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, columnDefinition = "text")
    private String cuerpo;

    @Column(name = "publicado_en")
    private OffsetDateTime publicadoEn;

    /** TODOS, APODERADOS, DOCENTES o ALUMNOS. */
    @Column(name = "dirigido_a", nullable = false, length = 20)
    private String dirigidoA = "TODOS";
}
