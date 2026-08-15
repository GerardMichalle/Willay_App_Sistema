package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "curso_gratuito")
@Getter @Setter
public class CursoGratuito extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "colegio_id")
    private Colegio colegio;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 600)
    private String descripcion;

   @Column(nullable = false)
    private boolean activo = true;

    @Column(nullable = false)
    private short orden;

    @Column(name = "portada_url", length = 500)
    private String portadaUrl;

    @OneToMany(mappedBy = "curso", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<CategoriaCurso> categorias = new ArrayList<>();
}
