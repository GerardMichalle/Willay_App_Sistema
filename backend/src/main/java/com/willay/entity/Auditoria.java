package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "auditoria")
@Getter @Setter
public class Auditoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "colegio_id")
    private Long colegioId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false, length = 60)
    private String accion;

    @Column(length = 40)
    private String entidad;

    @Column(name = "entidad_id")
    private Long entidadId;

    @Column(length = 600)
    private String detalle;

    @Column(length = 45)
    private String ip;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();
}
