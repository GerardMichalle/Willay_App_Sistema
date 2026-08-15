package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "notificacion")
@Getter @Setter
public class Notificacion extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false, length = 25)
    private String tipo;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 500)
    private String cuerpo;

    @Column(nullable = false, length = 15)
    private String canal = "APP";

    @Column(name = "enviada_en")
    private OffsetDateTime enviadaEn;

    @Column(name = "leida_en")
    private OffsetDateTime leidaEn;
}
