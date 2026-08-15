package com.willay.exception;

/** Regla de negocio violada: se traduce a HTTP 422. */
public class BusinessException extends RuntimeException {
    public BusinessException(String mensaje) { super(mensaje); }
}
