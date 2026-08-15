package com.willay.dto;

public record ComunicadoDto(
        Long id,
        String titulo,
        String cuerpo,
        String autor,
        String dirigidoA,
        Long aulaId,
        String aula,
        String publicadoEn,
        boolean publicado,
        long lecturas,
        long destinatarios,
        boolean leidoPorMi
) {}
