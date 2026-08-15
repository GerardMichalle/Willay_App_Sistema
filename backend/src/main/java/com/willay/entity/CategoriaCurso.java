package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "categoria_curso")
@Getter @Setter
public class CategoriaCurso extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "curso_id")
    private CursoGratuito curso;

    @Column(nullable = false, length = 160)
    private String nombre;

    @Column(nullable = false)
    private short orden;

    @OneToMany(mappedBy = "categoria", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orden ASC")
    private List<RecursoCurso> recursos = new ArrayList<>();
}
