package com.willay.service;

import com.willay.audit.AccionAuditoria;
import com.willay.audit.AuditoriaService;
import com.willay.dto.ImportacionDto;
import com.willay.dto.MatriculaRequest;
import com.willay.dto.MatriculaResultadoDto;
import com.willay.entity.Aula;
import com.willay.exception.BusinessException;
import com.willay.repository.AlumnoRepository;
import com.willay.repository.AulaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

/**
 * Importación masiva de matrículas desde Excel.
 *
 * Flujo en dos pasos, deliberado:
 *   1. previsualizar() → lee, valida y devuelve TODO sin escribir nada.
 *   2. confirmar()     → ejecuta solo las filas válidas, en una transacción.
 *
 * Cargar 500 alumnos a ciegas y descubrir después que 30 tenían el aula mal
 * escrita obligaría a limpiar la base a mano. La vista previa lo evita.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportacionService {

    /** Columnas esperadas, en orden. Documentadas en la plantilla. */
    private static final String[] CABECERAS = {
            "NOMBRES_ALUMNO", "APELLIDOS_ALUMNO", "DNI_ALUMNO", "FECHA_NACIMIENTO",
            "GRADO", "SECCION", "NIVEL", "TARJETA_RFID",
            "NOMBRES_APODERADO", "APELLIDOS_APODERADO", "DNI_APODERADO",
            "TELEFONO_APODERADO", "CORREO_APODERADO", "PARENTESCO"
    };

    private static final int LIMITE_FILAS = 2000;

    private final AulaRepository aulaRepository;
    private final AlumnoRepository alumnoRepository;
    private final MatriculaService matriculaService;
    private final AuditoriaService auditoria;

    // ── Paso 1: vista previa ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public ImportacionDto previsualizar(Long colegioId, MultipartFile archivo) {
        List<ImportacionDto.FilaDto> filas = new ArrayList<>();
        Map<String, Aula> aulas = indexarAulas(colegioId);
        Set<String> dnisEnArchivo = new HashSet<>();

        try (InputStream in = archivo.getInputStream(); Workbook libro = new XSSFWorkbook(in)) {
            Sheet hoja = libro.getSheetAt(0);
            validarCabeceras(hoja);

            for (int i = 1; i <= hoja.getLastRowNum() && i <= LIMITE_FILAS; i++) {
                Row fila = hoja.getRow(i);
                if (fila == null || esFilaVacia(fila)) continue;
                filas.add(leerFila(fila, i + 1, aulas, dnisEnArchivo, colegioId));
            }
        } catch (IOException e) {
            throw new BusinessException("No se pudo leer el archivo. ¿Es un .xlsx válido?");
        }

        int validas = (int) filas.stream().filter(ImportacionDto.FilaDto::valida).count();
        return new ImportacionDto(filas.size(), validas, filas.size() - validas, filas);
    }

    // ── Paso 2: confirmación ─────────────────────────────────────────

    @Transactional
    public List<MatriculaResultadoDto> confirmar(Long colegioId, Long autorId,
                                                 MultipartFile archivo, String ip) {
        ImportacionDto vista = previsualizar(colegioId, archivo);
        Map<String, Aula> aulas = indexarAulas(colegioId);
        List<MatriculaResultadoDto> resultados = new ArrayList<>();

        for (ImportacionDto.FilaDto f : vista.filas()) {
            if (!f.valida()) continue;   // las filas con error se omiten, no rompen el lote
            Aula aula = aulas.get(f.aula());

            MatriculaRequest req = new MatriculaRequest(
                    new MatriculaRequest.DatosAlumno(
                            f.nombresAlumno(), f.apellidosAlumno(), vacioANulo(f.dniAlumno()),
                            null, aula.getId(), vacioANulo(f.tarjetaRfid()), false, null),
                    new MatriculaRequest.DatosApoderado(
                            f.nombresApoderado(), f.apellidosApoderado(), f.dniApoderado(),
                            vacioANulo(f.telefonoApoderado()), vacioANulo(f.correoApoderado()), "APODERADO"));

            resultados.add(matriculaService.matricular(colegioId, autorId, req, ip));
        }

        auditoria.registrar(AccionAuditoria.IMPORTACION_MASIVA, colegioId, autorId,
                resultados.size() + " matrículas importadas", ip);
        return resultados;
    }

    // ── Plantilla descargable ────────────────────────────────────────

    public byte[] plantilla() {
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet("Matriculas");

            CellStyle estilo = libro.createCellStyle();
            Font negrita = libro.createFont();
            negrita.setBold(true);
            estilo.setFont(negrita);

            Row cabecera = hoja.createRow(0);
            for (int i = 0; i < CABECERAS.length; i++) {
                Cell c = cabecera.createCell(i);
                c.setCellValue(CABECERAS[i]);
                c.setCellStyle(estilo);
                hoja.setColumnWidth(i, 5200);
            }

            // Fila de ejemplo para que quede claro el formato esperado
            String[] ejemplo = {
                    "Valeria", "Quispe Rojas", "61234567", "2014-07-30",
                    "5", "A", "PRIMARIA", "RF-88213",
                    "Rosa", "Rojas Medina", "42715836", "987654321", "rosa.rojas@gmail.com", "MADRE"
            };
            Row fila = hoja.createRow(1);
            for (int i = 0; i < ejemplo.length; i++) fila.createCell(i).setCellValue(ejemplo[i]);

            libro.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new BusinessException("No se pudo generar la plantilla");
        }
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private ImportacionDto.FilaDto leerFila(Row fila, int numero, Map<String, Aula> aulas,
                                            Set<String> dnisEnArchivo, Long colegioId) {
        String nombresAl   = texto(fila, 0);
        String apellidosAl = texto(fila, 1);
        String dniAl       = texto(fila, 2);
        String grado       = texto(fila, 4);
        String seccion     = texto(fila, 5);
        String nivel       = texto(fila, 6).toUpperCase();
        String tarjeta     = texto(fila, 7);
        String nombresAp   = texto(fila, 8);
        String apellidosAp = texto(fila, 9);
        String dniAp       = texto(fila, 10);
        String telefonoAp  = texto(fila, 11);
        String correoAp    = texto(fila, 12);

        if (nivel.isBlank()) nivel = "PRIMARIA";
        String clave = nivel + "|" + grado + "|" + seccion.toUpperCase();

        List<String> errores = new ArrayList<>();
        if (nombresAl.isBlank())   errores.add("Falta el nombre del estudiante");
        if (apellidosAl.isBlank()) errores.add("Faltan los apellidos del estudiante");
        if (nombresAp.isBlank() || apellidosAp.isBlank()) errores.add("Faltan datos del apoderado");
        if (!dniAp.matches("\\d{8}"))  errores.add("DNI del apoderado inválido (8 dígitos)");
        if (!dniAl.isBlank() && !dniAl.matches("\\d{8}")) errores.add("DNI del estudiante inválido");
        if (!aulas.containsKey(clave)) errores.add("No existe el aula " + grado + "° " + seccion + " (" + nivel + ")");

        if (!dniAl.isBlank()) {
            if (!dnisEnArchivo.add(dniAl)) errores.add("DNI repetido dentro del archivo");
            else if (alumnoRepository.existsByColegioIdAndDni(colegioId, dniAl))
                errores.add("El estudiante ya está matriculado");
        }

        return new ImportacionDto.FilaDto(numero, nombresAl, apellidosAl, dniAl, clave,
                nombresAp, apellidosAp, dniAp, telefonoAp, correoAp, tarjeta,
                errores.isEmpty(), errores);
    }

    private Map<String, Aula> indexarAulas(Long colegioId) {
        Map<String, Aula> mapa = new HashMap<>();
        for (Aula a : aulaRepository.findByColegioIdAndActivoTrueOrderByGradoAscSeccionAsc(colegioId)) {
            mapa.put(a.getNivel() + "|" + a.getGrado() + "|" + a.getSeccion().toUpperCase(), a);
        }
        return mapa;
    }

    private void validarCabeceras(Sheet hoja) {
        Row cabecera = hoja.getRow(0);
        if (cabecera == null) {
            throw new BusinessException("El archivo está vacío o no tiene fila de cabeceras");
        }
        String primera = texto(cabecera, 0).trim().toUpperCase();
        if (!primera.startsWith("NOMBRES")) {
            throw new BusinessException(
                    "El archivo no coincide con la plantilla. Descárgala y vuelve a intentarlo.");
        }
    }

    private boolean esFilaVacia(Row fila) {
        for (int c = 0; c < CABECERAS.length; c++) {
            if (!texto(fila, c).isBlank()) return false;
        }
        return true;
    }

    /** Lee cualquier tipo de celda como texto limpio (Excel mezcla tipos). */
    private String texto(Row fila, int columna) {
        Cell c = fila.getCell(columna);
        if (c == null) return "";
        return switch (c.getCellType()) {
            case STRING -> c.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(c)
                    ? c.getDateCellValue().toInstant().atZone(ZoneId.systemDefault())
                        .toLocalDate().format(java.time.format.DateTimeFormatter.ISO_DATE)
                    : String.valueOf((long) c.getNumericCellValue());
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> {
                try { yield c.getStringCellValue().trim(); }
                catch (Exception e) { yield String.valueOf((long) c.getNumericCellValue()); }
            }
            default -> "";
        };
    }

    private String vacioANulo(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    @SuppressWarnings("unused")
    private LocalDate fecha(String v) {
        try { return LocalDate.parse(v); } catch (Exception e) { return null; }
    }
}
