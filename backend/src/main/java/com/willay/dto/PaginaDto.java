package com.willay.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** Envoltorio de paginación estable e independiente de Spring. */
public record PaginaDto<T>(
        List<T> contenido,
        int pagina,
        int tamano,
        long total,
        int totalPaginas
) {
    public static <T> PaginaDto<T> de(Page<T> page) {
        return new PaginaDto<>(page.getContent(), page.getNumber(),
                page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
