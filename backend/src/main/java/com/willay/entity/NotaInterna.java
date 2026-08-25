package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

/** Recordatorio del Superadmin sobre un colegio cliente (uso interno del proveedor). */
@Entity
@Table(name = "nota_interna")
@Getter @Setter
public class NotaInterna {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colegio_id", nullable = false)
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id", nullable = false)
    private Usuario autor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenido;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();
}
