package com.willay.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "recurso_curso")
@Getter @Setter
public class RecursoCurso extends EntidadBase {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id")
    private CategoriaCurso categoria;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(nullable = false, length = 10)
    private String tipo;

   @Column(name = "url_archivo", length = 500)
    private String urlArchivo;

    /** Identificador del archivo subido al sistema (tabla archivo) */
    @Column(name = "archivo_uuid")
    private java.util.UUID archivoUuid;

    @Column(name = "tamano_bytes")
    private Long tamanoBytes;

    @Column(name = "duracion_seg")
    private Integer duracionSeg;

    @Column(nullable = false)
    private short orden;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subido_por")
    private Usuario subidoPor;
}
