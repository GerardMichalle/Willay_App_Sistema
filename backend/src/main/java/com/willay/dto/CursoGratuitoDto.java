package com.willay.dto;

import java.util.List;

public record CursoGratuitoDto(
        Long id,
        String titulo,
        String descripcion,
        String portadaUrl,
        boolean global,
        int orden,
        long inscritos,
        List<CategoriaDto> categorias
) {
    public record CategoriaDto(Long id, String nombre, int orden, List<RecursoDto> recursos) {}

    public record RecursoDto(
            Long id, String titulo, String tipo, String urlArchivo,
            String tamano, String duracion, int orden) {}
}