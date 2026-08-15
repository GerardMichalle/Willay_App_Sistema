package com.willay.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = DniValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface Dni {
    String message() default "DNI inválido: deben ser 8 dígitos";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
