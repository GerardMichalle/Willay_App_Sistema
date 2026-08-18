package com.willay.dto;

/** Evento de "tarjeta sin asignar" difundido a la pantalla de Vincular tarjetas. */
public record TarjetaSinAsignarDto(
        String uid,
        String detectadoEn
) {}
