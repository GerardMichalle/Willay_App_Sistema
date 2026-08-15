package com.willay.exception;

import java.time.OffsetDateTime;
import java.util.Map;

public record ApiError(
        int status,
        String error,
        String mensaje,
        Map<String, String> detalles,
        OffsetDateTime momento
) {
    public static ApiError de(int status, String error, String mensaje, Map<String, String> detalles) {
        return new ApiError(status, error, mensaje, detalles, OffsetDateTime.now());
    }
}
