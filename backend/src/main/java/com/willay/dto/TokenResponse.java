package com.willay.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        UsuarioDto usuario
) {}
