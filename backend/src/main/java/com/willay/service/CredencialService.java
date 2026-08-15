package com.willay.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import com.willay.entity.Alumno;
import com.willay.exception.BusinessException;
import com.willay.exception.NotFoundException;
import com.willay.repository.AlumnoRepository;
import com.willay.repository.TarjetaRfidRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.util.Map;

/**
 * Credenciales de estudiante.
 *
 * El QR no contiene datos personales: solo el código del estudiante y el
 * del colegio. Así, si alguien fotografía la credencial de un niño, no
 * obtiene su nombre, DNI ni dirección — solo un identificador que sin
 * acceso al sistema no significa nada.
 */
@Service
@RequiredArgsConstructor
public class CredencialService {

    private static final int TAMANO_PX = 512;

    private final AlumnoRepository alumnoRepository;
    private final TarjetaRfidRepository tarjetaRepository;

    @Transactional(readOnly = true)
    public byte[] qrDeAlumno(Long colegioId, Long alumnoId) {
        Alumno alumno = alumnoRepository.findByIdAndColegioId(alumnoId, colegioId)
                .orElseThrow(() -> new NotFoundException("Estudiante no encontrado"));

        String tarjeta = tarjetaRepository.findByAlumnoIdAndEstado(alumnoId, "ACTIVA")
                .map(t -> t.getCodigo()).orElse("");

        // Formato propio, verificable por el lector: WILLAY|colegio|alumno|tarjeta
        String contenido = "WILLAY|" + colegioId + "|" + alumno.getCodigo() + "|" + tarjeta;
        return generarQr(contenido);
    }

    public byte[] generarQr(String contenido) {
        try {
            Map<EncodeHintType, Object> pistas = Map.of(
                    EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
                    EncodeHintType.MARGIN, 1,
                    EncodeHintType.CHARACTER_SET, "UTF-8");

            BitMatrix matriz = new QRCodeWriter()
                    .encode(contenido, BarcodeFormat.QR_CODE, TAMANO_PX, TAMANO_PX, pistas);

            ByteArrayOutputStream salida = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matriz, "PNG", salida);
            return salida.toByteArray();
        } catch (Exception e) {
            throw new BusinessException("No se pudo generar el código QR");
        }
    }
}
