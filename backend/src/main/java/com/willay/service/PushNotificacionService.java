package com.willay.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.willay.entity.FcmToken;
import com.willay.entity.PushSuscripcion;
import com.willay.repository.FcmTokenRepository;
import com.willay.repository.PushSuscripcionRepository;
import com.willay.repository.UsuarioRepository;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import java.util.List;
import java.util.Map;

/**
 * Envío de notificaciones push del navegador (Web Push / VAPID) — el mismo
 * texto que ya se guarda como {@link com.willay.entity.Notificacion}, pero
 * como una notificación real del sistema operativo, incluso con el
 * navegador cerrado.
 *
 * Es "mejor esfuerzo", igual que el correo con Resend: sin claves VAPID
 * configuradas, o si el envío falla, se registra en el log y la operación
 * que lo disparó sigue igual. Una suscripción que el navegador ya revocó
 * (respuesta 404/410, típico de Web Push) se borra sola — no tiene sentido
 * conservar suscripciones muertas.
 */
@Service
@Slf4j
public class PushNotificacionService {

    private final PushSuscripcionRepository suscripcionRepository;
    private final FcmTokenRepository fcmTokenRepository;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;
    private final String clavePublica;
    private final String clavePrivada;
    private final String subject;
    private final boolean firebaseListo;

    public PushNotificacionService(
            PushSuscripcionRepository suscripcionRepository,
            FcmTokenRepository fcmTokenRepository,
            UsuarioRepository usuarioRepository,
            ObjectMapper objectMapper,
            @Value("${willay.push.vapid-public-key:}") String clavePublica,
            @Value("${willay.push.vapid-private-key:}") String clavePrivada,
            @Value("${willay.push.vapid-subject:mailto:soporte@willay.app}") String subject,
            @Value("${willay.push.firebase-credentials-json:}") String firebaseCredencialesJson) {
        this.suscripcionRepository = suscripcionRepository;
        this.fcmTokenRepository = fcmTokenRepository;
        this.usuarioRepository = usuarioRepository;
        this.objectMapper = objectMapper;
        this.clavePublica = clavePublica;
        this.clavePrivada = clavePrivada;
        this.subject = subject;
        Security.addProvider(new BouncyCastleProvider());
        this.firebaseListo = inicializarFirebase(firebaseCredencialesJson);
    }

    /**
     * Best-effort, igual que VAPID: sin credenciales configuradas (o si son
     * inválidas), el push nativo simplemente se omite — nunca debe impedir
     * que el backend arranque.
     */
    private boolean inicializarFirebase(String credencialesJson) {
        if (credencialesJson.isBlank()) {
            log.info("FIREBASE_CREDENTIALS_JSON no configurado: push nativo (FCM) deshabilitado");
            return false;
        }
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credenciales = GoogleCredentials.fromStream(
                        new ByteArrayInputStream(credencialesJson.getBytes(StandardCharsets.UTF_8)));
                FirebaseApp.initializeApp(FirebaseOptions.builder().setCredentials(credenciales).build());
            }
            return true;
        } catch (Exception e) {
            log.warn("No se pudo inicializar Firebase (push nativo deshabilitado): {}", e.getMessage());
            return false;
        }
    }

    /** La necesita el navegador para suscribirse; vacía si VAPID no está configurado. */
    public String clavePublica() {
        return clavePublica;
    }

    /** Da de alta (o actualiza, si el mismo endpoint ya existía) la suscripción de un dispositivo. */
    @Transactional
    public void suscribir(Long usuarioId, String endpoint, String p256dh, String auth) {
        PushSuscripcion s = suscripcionRepository.findByEndpoint(endpoint).orElseGet(PushSuscripcion::new);
        s.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        s.setEndpoint(endpoint);
        s.setP256dh(p256dh);
        s.setAuth(auth);
        suscripcionRepository.save(s);
    }

    @Transactional
    public void desuscribir(Long usuarioId, String endpoint) {
        suscripcionRepository.deleteByUsuarioIdAndEndpoint(usuarioId, endpoint);
    }

    /** Da de alta (o refresca, si el token ya existía) el dispositivo Android para push nativo. */
    @Transactional
    public void registrarTokenFcm(Long usuarioId, String token) {
        FcmToken t = fcmTokenRepository.findByToken(token).orElseGet(FcmToken::new);
        t.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        t.setToken(token);
        fcmTokenRepository.save(t);
    }

    @Transactional
    public void eliminarTokenFcm(Long usuarioId, String token) {
        fcmTokenRepository.deleteByUsuarioIdAndToken(usuarioId, token);
    }

    @Transactional
    public void enviar(Long usuarioId, String titulo, String cuerpo) {
        enviarPorWebPush(usuarioId, titulo, cuerpo);
        enviarPorFcm(usuarioId, titulo, cuerpo);
    }

    private void enviarPorWebPush(Long usuarioId, String titulo, String cuerpo) {
        if (clavePublica.isBlank() || clavePrivada.isBlank()) {
            log.info("VAPID no configurado: notificación push a usuario {} omitida (\"{}\")", usuarioId, titulo);
            return;
        }
        try {
            List<PushSuscripcion> suscripciones = suscripcionRepository.findByUsuarioId(usuarioId);
            if (suscripciones.isEmpty()) return;

            String payload = objectMapper.writeValueAsString(Map.of("titulo", titulo, "cuerpo", cuerpo));
            PushService servicio = new PushService(clavePublica, clavePrivada, subject);

            for (PushSuscripcion s : suscripciones) {
                enviarAUna(servicio, s, payload);
            }
        } catch (Exception e) {
            log.warn("No se pudo enviar la notificación push a usuario {}: {}", usuarioId, e.getMessage());
        }
    }

    private void enviarPorFcm(Long usuarioId, String titulo, String cuerpo) {
        if (!firebaseListo) return;
        List<FcmToken> tokens = fcmTokenRepository.findByUsuarioId(usuarioId);
        if (tokens.isEmpty()) return;

        com.google.firebase.messaging.Notification notificacion =
                com.google.firebase.messaging.Notification.builder().setTitle(titulo).setBody(cuerpo).build();

        for (FcmToken t : tokens) {
            try {
                Message mensaje = Message.builder().setToken(t.getToken()).setNotification(notificacion).build();
                FirebaseMessaging.getInstance().send(mensaje);
            } catch (FirebaseMessagingException e) {
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                        || e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                    fcmTokenRepository.delete(t);
                }
                log.warn("No se pudo enviar push nativo al token {}: {}", t.getId(), e.getMessage());
            } catch (Exception e) {
                log.warn("No se pudo enviar push nativo al token {}: {}", t.getId(), e.getMessage());
            }
        }
    }

    private void enviarAUna(PushService servicio, PushSuscripcion s, String payload) {
        try {
            Subscription suscripcion = new Subscription(s.getEndpoint(),
                    new Subscription.Keys(s.getP256dh(), s.getAuth()));
            Notification notification = new Notification(suscripcion, payload);
            // AES128GCM explícito: PushService.send(notification) por defecto usa el
            // esquema AESGCM (obsoleto), que en la versión 5.1.2 de esta librería arma
            // mal la cabecera Crypto-Key (le falta quitar el padding del base64url) y
            // FCM la rechaza con 403 "crypto-key header had invalid format". AES128GCM
            // es además el esquema RFC 8291 estándar que usan los navegadores actuales.
            HttpResponse respuesta = servicio.send(notification, Encoding.AES128GCM);
            int codigo = respuesta.getStatusLine().getStatusCode();
            if (codigo == 404 || codigo == 410) {
                suscripcionRepository.delete(s);
            }
        } catch (Exception e) {
            log.warn("No se pudo enviar push a la suscripción {}: {}", s.getId(), e.getMessage());
        }
    }
}
