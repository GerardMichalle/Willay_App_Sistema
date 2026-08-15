package com.willay.dto;

public record NotificacionDto(
        Long id,
        String tipo,
        String titulo,
        String cuerpo,
        String cuando,
        boolean leida
) {}
