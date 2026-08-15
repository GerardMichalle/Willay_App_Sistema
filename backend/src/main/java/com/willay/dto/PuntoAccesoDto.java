package com.willay.dto;

public record PuntoAccesoDto(
        Long id,
        String nombre,
        boolean activo,
        boolean enLinea,
        String ultimoLatido,
        String apiKeyNueva      // solo se devuelve al crear o regenerar
) {}
