package com.willay.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class DniValidator implements ConstraintValidator<Dni, String> {
    @Override
    public boolean isValid(String valor, ConstraintValidatorContext ctx) {
        if (valor == null) return true;    // @NotBlank se encarga del vacío
        return valor.matches("\\d{8}");
    }
}
