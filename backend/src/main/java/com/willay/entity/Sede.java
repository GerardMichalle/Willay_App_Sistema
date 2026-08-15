package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sede")
@Getter @Setter
public class Sede extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 240)
    private String direccion;

    @Column(nullable = false)
    private boolean activo = true;
}
