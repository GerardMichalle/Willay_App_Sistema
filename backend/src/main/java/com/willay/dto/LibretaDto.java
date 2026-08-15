package com.willay.dto;

import java.util.List;

public record LibretaDto(
        Long id,
        Long alumnoId,
        String codigoAlumno,
        String alumno,
        String aula,
        String periodo,
        int anioEscolar,
        Double promedio,
        String observacion,
        boolean publicada,
        String publicadaEn,
        List<NotaDto> notas,
        boolean tieneArchivo,
        String archivoUuid
) {
    public record NotaDto(Long cursoId, String curso, String abreviatura,
                          double calificacion, String comentario) {}
}
