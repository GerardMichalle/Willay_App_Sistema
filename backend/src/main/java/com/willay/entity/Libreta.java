package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "libreta")
@Getter @Setter
public class Libreta extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "alumno_id")
    private Alumno alumno;

    @Column(nullable = false, length = 20)
    private String periodo;

    @Column(name = "anio_escolar", nullable = false)
    private short anioEscolar;

    private BigDecimal promedio;

    @Column(length = 500)
    private String observacion;

    /** NULL mientras es borrador: solo la ve el docente. */
    @Column(name = "publicada_en")
    private OffsetDateTime publicadaEn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publicada_por")
    private Usuario publicadaPor;

    /** Identificador del archivo escaneado (tabla archivo), si la libreta es un documento subido. */
    @Column(name = "archivo_uuid")
    private UUID archivoUuid;

    @OneToMany(mappedBy = "libreta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Nota> notas = new ArrayList<>();
}
