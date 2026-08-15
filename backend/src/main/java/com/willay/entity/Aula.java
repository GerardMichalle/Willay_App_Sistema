package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "aula")
@Getter @Setter
public class Aula extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sede_id")
    private Sede sede;

    @Column(nullable = false, length = 15)
    private String nivel;

    @Column(nullable = false, length = 10)
    private String grado;

    @Column(nullable = false, length = 5)
    private String seccion;

    @Column(name = "anio_escolar", nullable = false)
    private short anioEscolar;

    @Column(nullable = false)
    private boolean activo = true;

    public String etiqueta() {
        return grado + "\u00b0 \"" + seccion + "\"";
    }
}
