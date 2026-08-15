package com.willay.service;

import com.willay.entity.Alumno;
import com.willay.entity.Asistencia;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * Exportación a Excel de los listados que el colegio necesita presentar.
 * Se emplea el mismo formato de la importación para que los archivos
 * puedan reutilizarse entre periodos.
 */
@Service
@RequiredArgsConstructor
public class ExportacionService {

    private final AlumnoRepository alumnoRepository;
    private final AsistenciaRepository asistenciaRepository;
    private final TarjetaRfidRepository tarjetaRepository;

    @Transactional(readOnly = true)
    public byte[] alumnos(Long colegioId) {
        List<Alumno> lista = alumnoRepository.findByColegioIdOrderByApellidosAsc(colegioId);
        return construir("Alumnos",
                new String[]{"CODIGO", "APELLIDOS", "NOMBRES", "DNI", "NIVEL", "GRADO", "SECCION", "TARJETA", "ESTADO"},
                hoja -> {
                    int f = 1;
                    for (Alumno a : lista) {
                        Row fila = hoja.createRow(f++);
                        fila.createCell(0).setCellValue(a.getCodigo());
                        fila.createCell(1).setCellValue(a.getApellidos());
                        fila.createCell(2).setCellValue(a.getNombres());
                        fila.createCell(3).setCellValue(a.getDni() == null ? "" : a.getDni());
                        fila.createCell(4).setCellValue(a.getAula() != null ? a.getAula().getNivel() : "");
                        fila.createCell(5).setCellValue(a.getAula() != null ? a.getAula().getGrado() : "");
                        fila.createCell(6).setCellValue(a.getAula() != null ? a.getAula().getSeccion() : "");
                        fila.createCell(7).setCellValue(tarjetaRepository
                                .findByAlumnoIdAndEstado(a.getId(), "ACTIVA")
                                .map(t -> t.getCodigo()).orElse(""));
                        fila.createCell(8).setCellValue(a.getEstado());
                    }
                });
    }

    @Transactional(readOnly = true)
    public byte[] asistencia(Long colegioId, LocalDate fecha) {
        List<Asistencia> lista = asistenciaRepository
                .findByColegioIdAndFechaOrderByHoraEntradaAsc(colegioId, fecha);
        return construir("Asistencia " + fecha,
                new String[]{"FECHA", "CODIGO", "APELLIDOS", "NOMBRES", "AULA", "ENTRADA", "SALIDA", "ESTADO"},
                hoja -> {
                    int f = 1;
                    for (Asistencia a : lista) {
                        Alumno al = a.getAlumno();
                        Row fila = hoja.createRow(f++);
                        fila.createCell(0).setCellValue(a.getFecha().toString());
                        fila.createCell(1).setCellValue(al.getCodigo());
                        fila.createCell(2).setCellValue(al.getApellidos());
                        fila.createCell(3).setCellValue(al.getNombres());
                        fila.createCell(4).setCellValue(al.getAula() != null ? al.getAula().etiqueta() : "");
                        fila.createCell(5).setCellValue(a.getHoraEntrada() == null ? "" : a.getHoraEntrada().toString());
                        fila.createCell(6).setCellValue(a.getHoraSalida() == null ? "" : a.getHoraSalida().toString());
                        fila.createCell(7).setCellValue(a.getEstado() == null ? "" : a.getEstado());
                    }
                });
    }

    private interface Relleno { void aplicar(Sheet hoja); }

    private byte[] construir(String nombreHoja, String[] cabeceras, Relleno relleno) {
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet(nombreHoja.length() > 31 ? nombreHoja.substring(0, 31) : nombreHoja);

            CellStyle estilo = libro.createCellStyle();
            Font negrita = libro.createFont();
            negrita.setBold(true);
            estilo.setFont(negrita);

            Row cabecera = hoja.createRow(0);
            for (int i = 0; i < cabeceras.length; i++) {
                Cell c = cabecera.createCell(i);
                c.setCellValue(cabeceras[i]);
                c.setCellStyle(estilo);
                hoja.setColumnWidth(i, 4600);
            }

            relleno.aplicar(hoja);
            libro.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new com.willay.exception.BusinessException("No se pudo generar el archivo");
        }
    }
}
