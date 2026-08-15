package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "punto_acceso")
@Getter @Setter
public class PuntoAcceso extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(nullable = false, length = 80)
    private String nombre;

    /** BCrypt de la api-key del dispositivo físico. */
    @Column(name = "api_key_hash", nullable = false, length = 72)
    private String apiKeyHash;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "ultimo_latido")
    private OffsetDateTime ultimoLatido;
}
