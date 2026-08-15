package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "usuario")
@Getter @Setter
public class Usuario extends EntidadBase {

    /** NULL solo para SUPER_ADMIN (ver restricción ck_usuario_colegio). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @Column(nullable = false, length = 160)
    private String correo;

    /** BCrypt. NULL mientras la cuenta no se activa. */
    @Column(name = "clave_hash", length = 72)
    private String claveHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Rol rol;

    @Column(nullable = false, length = 120)
    private String nombres;

    @Column(nullable = false, length = 120)
    private String apellidos;

    @Column(length = 12)
    private String dni;

    @Column(length = 20)
    private String telefono;

    @Column(name = "foto_url", length = 400)
    private String fotoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private EstadoUsuario estado = EstadoUsuario.PENDIENTE;

    @Column(name = "ultimo_acceso")
    private OffsetDateTime ultimoAcceso;

    public String nombreCompleto() {
        return nombres + " " + apellidos;
    }
}
