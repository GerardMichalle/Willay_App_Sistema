package com.willay.service;

import com.willay.entity.Usuario;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Envío de correos transaccionales (código de activación, recuperación de
 * contraseña). Es "mejor esfuerzo": si el correo falla (SMTP mal configurado,
 * sin conexión, credencial vencida) se registra en el log y la operación que
 * lo disparó sigue igual — la familia siempre puede ver el código en pantalla
 * como hasta ahora. Un correo caído nunca debe bloquear una matrícula.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CorreoService {

    private final JavaMailSender mailSender;

    @Value("${willay.correo.remitente:Willay <willaysoporte@gmail.com>}")
    private String remitente;

    public void enviarCodigoActivacion(Usuario usuario, String codigo, int diasVigencia) {
        String colegio = usuario.getColegio() != null ? usuario.getColegio().getNombre() : "tu colegio";
        String asunto = "Tu código de activación de Willay";
        String tituloBanner = "¡Bienvenido a Willay!";
        String mensaje = "Con este código activas tu cuenta y creas tu contraseña. Te lo entrega "
                + escapar(colegio) + " a través de Willay para que ingreses a la plataforma.";
        String nota = "Válido por " + diasVigencia + " días. Solo la institución puede emitir códigos: "
                + "si alguien más te lo pide por teléfono o WhatsApp, no lo compartas.";
        enviar(usuario.getCorreo(), asunto, plantilla(
                tituloBanner, usuario.getNombres(), "Tu código de activación", mensaje, codigo, nota));
    }

    public void enviarCodigoRecuperacion(Usuario usuario, String codigo, int minutosVigencia) {
        String asunto = "Recupera tu contraseña de Willay";
        String tituloBanner = "Recupera tu contraseña";
        String mensaje = "Recibimos una solicitud para restablecer tu contraseña. Usa este código para crear una nueva.";
        String nota = "Válido por " + minutosVigencia + " minutos. Si tú no pediste esto, ignora el correo: "
                + "tu contraseña actual sigue funcionando.";
        enviar(usuario.getCorreo(), asunto, plantilla(
                tituloBanner, usuario.getNombres(), "Tu código de recuperación", mensaje, codigo, nota));
    }

    private void enviar(String destinatario, String asunto, String html) {
        if (destinatario == null || destinatario.isBlank()) return;
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, "UTF-8");
            helper.setFrom(remitente);
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(html, true);
            mailSender.send(mensaje);
        } catch (Exception e) {
            log.warn("No se pudo enviar el correo a {}: {}", destinatario, e.getMessage());
        }
    }

    private String escapar(String v) {
        return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * HTML autocontenido con estilos en línea (los clientes de correo, sobre
     * todo Gmail, ignoran bloques &lt;style&gt; y CSS moderno): tablas
     * anidadas, sin flexbox/grid, colores exactos de la marca (#E02D2D).
     */
    private String plantilla(String tituloBanner, String nombre, String etiquetaCodigo,
                              String mensaje, String codigo, String nota) {
        String primerNombre = nombre == null || nombre.isBlank() ? "" : nombre.trim().split("\\s+")[0];
        String codigoEspaciado = String.join(" ", codigo.split(""));
        return """
            <!doctype html>
            <html>
            <body style="margin:0;padding:0;background:#F2F1F6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#F2F1F6;padding:32px 16px;">
                <tr><td align="center">
                  <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%%;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(224,45,45,.12);">

                    <!-- Banda de marca -->
                    <tr><td style="background:#E02D2D;padding:28px 32px 24px;text-align:center;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
                        <tr>
                          <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0"><tr><td width="9" height="9" style="background:#FFFFFF;border-radius:50%%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                          <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0"><tr><td width="9" height="9" style="background:#F8B4B4;border-radius:50%%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                          <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0"><tr><td width="9" height="9" style="background:#FFFFFF;border-radius:50%%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                          <td style="padding:0 3px;"><table cellpadding="0" cellspacing="0"><tr><td width="9" height="9" style="background:#F8B4B4;border-radius:50%%;font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
                        </tr>
                      </table>
                      <div style="color:#FFFFFF;font-size:19px;font-weight:800;letter-spacing:-.2px;">Willay</div>
                      <div style="color:#FDEBEB;font-size:13px;font-weight:600;margin-top:10px;">%s</div>
                    </td></tr>

                    <!-- Cuerpo -->
                    <tr><td style="padding:32px 32px 8px;">
                      <p style="margin:0 0 4px;color:#8A8792;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">¡Hola, %s!</p>
                      <p style="margin:0 0 22px;color:#3A3740;font-size:14px;line-height:1.55;">%s</p>

                      <p style="margin:0 0 10px;color:#8A8792;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;text-align:center;">%s</p>
                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
                        <tr><td align="center" style="background:#FDEBEB;border-radius:14px;padding:18px 12px;">
                          <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:8px;color:#C51F1F;">%s</span>
                        </td></tr>
                      </table>

                      <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#F9F8FB;border-radius:12px;padding:2px;margin-bottom:6px;">
                        <tr><td style="padding:14px 16px;color:#6F6C78;font-size:12px;line-height:1.6;">%s</td></tr>
                      </table>
                    </td></tr>

                    <!-- Pie -->
                    <tr><td style="padding:20px 32px 30px;border-top:1px solid #F0EFF3;">
                      <p style="margin:0;color:#B3B0BC;font-size:11px;text-align:center;">Este correo fue enviado por Willay · Gestión escolar</p>
                    </td></tr>

                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(tituloBanner, escapar(primerNombre), escapar(mensaje), escapar(etiquetaCodigo), codigoEspaciado, escapar(nota));
    }
}
