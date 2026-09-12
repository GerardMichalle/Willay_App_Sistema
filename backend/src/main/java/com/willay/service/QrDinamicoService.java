package com.willay.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

/**
 * QR "de respaldo" para cuando un alumno olvida su tarjeta: a diferencia
 * del QR estático de la credencial (siempre el mismo contenido, pensado
 * para imprimir), este cambia cada {@link #VENTANA_SEGUNDOS} segundos y
 * el backend rechaza cualquier copia ya vencida — una foto guardada deja
 * de servir casi de inmediato. No reemplaza los lectores físicos; es un
 * canal más que AsistenciaService.resolverAlumno() acepta en paralelo.
 *
 * La clave HMAC se deriva de JWT_SECRET con un "domain separator" propio,
 * para no reutilizar la misma clave cruda que firma los JWT de sesión.
 */
@Service
public class QrDinamicoService {

    private static final int VENTANA_SEGUNDOS = 30;
    private static final String PREFIJO = "WILLAYQR";

    /** Bytes inmutables: seguros de compartir entre hilos, a diferencia de un Mac ya inicializado. */
    private final byte[] claveDerivada;

    public QrDinamicoService(@Value("${willay.jwt.secreto}") String jwtSecreto) {
        try {
            Mac derivador = Mac.getInstance("HmacSHA256");
            derivador.init(new SecretKeySpec(jwtSecreto.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            this.claveDerivada = derivador.doFinal("willay-qr-dinamico".getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo inicializar la firma del QR dinámico", e);
        }
    }

    /** @return "WILLAYQR|colegioId|codigoAlumno|expiraEpochSeconds|firma" */
    public String generar(Long colegioId, String codigoAlumno) {
        long expira = Instant.now().getEpochSecond() + VENTANA_SEGUNDOS;
        String payload = PREFIJO + "|" + colegioId + "|" + codigoAlumno + "|" + expira;
        return payload + "|" + firmar(payload);
    }

    public int ventanaSegundos() {
        return VENTANA_SEGUNDOS;
    }

    /** @return el código del alumno si el token es válido y no expiró; null si no. */
    public String validar(Long colegioId, String token) {
        String[] partes = token.split("\\|");
        if (partes.length != 5 || !PREFIJO.equals(partes[0])) return null;

        String payload = partes[0] + "|" + partes[1] + "|" + partes[2] + "|" + partes[3];
        if (!firmasIguales(firmar(payload), partes[4])) return null;
        if (!colegioId.toString().equals(partes[1])) return null;

        try {
            long expira = Long.parseLong(partes[3]);
            if (Instant.now().getEpochSecond() > expira) return null;
        } catch (NumberFormatException e) {
            return null;
        }
        return partes[2];
    }

    /**
     * Hex en MAYÚSCULAS a propósito: registrarLectura() hace .toUpperCase()
     * sobre todo lo que llega (igual que con el código de tarjeta), así que
     * el token debe sobrevivir esa normalización sin cambiar de valor.
     */
    private String firmar(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(claveDerivada, "HmacSHA256"));
            return HexFormat.of().withUpperCase().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el QR dinámico", e);
        }
    }

    /** Comparación en tiempo constante: evita filtrar la firma correcta byte a byte. */
    private boolean firmasIguales(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
