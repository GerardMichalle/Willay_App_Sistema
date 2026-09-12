package com.willay.dto;

/** QR de respaldo que cambia cada pocos segundos; ver QrDinamicoService. */
public record QrDinamicoDto(String contenido, int expiraEnSegundos) {}
