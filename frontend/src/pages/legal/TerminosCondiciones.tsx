import LayoutLegal from '../../components/LayoutLegal';

/** Página pública (sin sesión) — enlazada desde la Política de Privacidad y desde Play Store. */
export default function TerminosCondiciones() {
  return (
    <LayoutLegal titulo="Términos y Condiciones" actualizado="13 de septiembre de 2026">
      <div className="legal-doc">
        <p className="aviso">
          Willay es una herramienta que tu colegio contrata para su gestión interna. Si eres
          alumno o apoderado, tu acceso a la plataforma depende de que el colegio te haya dado
          de alta — no existe un registro público ni autoservicio para crear una cuenta.
        </p>

        <h2>1 · Quién ofrece el servicio</h2>
        <p>
          Willay es un sistema de gestión escolar (control de asistencia por tarjeta RFID/NFC
          o código QR, libreta virtual, comunicados y reportes) contratado por colegios para su
          uso interno. Estos Términos rigen el uso del sitio web y de la aplicación móvil
          Willay para Android por parte del personal del colegio, docentes, alumnos y
          apoderados.
        </p>

        <h2>2 · Cuentas de usuario</h2>
        <ul>
          <li>Las cuentas las crea el colegio (o un administrador autorizado por este) — no hay
            registro abierto al público.</li>
          <li>Cada usuario es responsable de mantener la confidencialidad de su contraseña y de
            toda actividad realizada desde su cuenta.</li>
          <li>Un alumno menor de edad accede a la plataforma únicamente con el conocimiento y
            autorización de su padre, madre o apoderado, otorgada al colegio al momento de la
            matrícula.</li>
          <li>El colegio puede solicitar la suspensión o eliminación de una cuenta en cualquier
            momento (por ejemplo, al retirarse un estudiante o egresar un docente).</li>
        </ul>

        <h2>3 · Uso aceptable</h2>
        <p>Al usar Willay, te comprometes a:</p>
        <ul>
          <li>Usar la plataforma únicamente para los fines de gestión escolar para los que fue
            provista.</li>
          <li>No intentar acceder a información de otros alumnos, familias o colegios distintos
            a los que tu rol permite ver.</li>
          <li>No compartir tu credencial de acceso (usuario/contraseña) con terceros.</li>
          <li>No usar el escáner de QR ni ninguna función de la app para registrar asistencia
            falsa o suplantar a otro estudiante.</li>
          <li>Reportar de inmediato cualquier uso indebido o vulnerabilidad detectada, escribiendo
            a <a href="mailto:soporte@willay.app">soporte@willay.app</a>.</li>
        </ul>

        <h2>4 · Permisos de la aplicación móvil</h2>
        <p>La app Android solicita los siguientes permisos, cada uno con un propósito
          específico y sin uso alternativo:</p>
        <ul>
          <li><strong>Cámara:</strong> exclusivamente para escanear el código QR de una
            credencial y registrar una entrada/salida.</li>
          <li><strong>Notificaciones:</strong> para avisos de asistencia y comunicados del
            colegio, si el usuario decide activarlas.</li>
          <li><strong>Internet:</strong> para comunicarse con el sistema del colegio.</li>
        </ul>
        <p>Ningún permiso se usa para publicidad, rastreo entre apps, ni se vende a terceros.
          Ver el detalle completo en nuestra{' '}
          <a href="/legal/privacidad">Política de Privacidad</a>.</p>

        <h2>5 · Disponibilidad del servicio</h2>
        <p>
          Hacemos nuestro mejor esfuerzo para mantener la plataforma disponible, pero no
          garantizamos un funcionamiento ininterrumpido. La app móvil está diseñada para
          conservar localmente una lectura de asistencia que no pudo enviarse por falta de
          conexión, y sincronizarla automáticamente en cuanto la conexión se restablece.
        </p>

        <h2>6 · Propiedad del contenido</h2>
        <p>
          Los datos académicos y de asistencia que se registran en la plataforma pertenecen al
          colegio que los generó, en su calidad de titular del banco de datos personales
          correspondiente. Willay conserva la propiedad del software, marca y diseño de la
          plataforma.
        </p>

        <h2>7 · Limitación de responsabilidad</h2>
        <p>
          Willay es una herramienta de apoyo a la gestión escolar. El colegio mantiene la
          responsabilidad final sobre las decisiones académicas y administrativas que tome
          usando la información del sistema. Willay no se hace responsable por decisiones
          tomadas exclusivamente en base a la plataforma sin la verificación correspondiente
          del colegio.
        </p>

        <h2>8 · Cambios a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos para reflejar cambios en el servicio o en la
          normativa aplicable. La fecha de "Última actualización" en la parte superior indica
          la versión vigente.
        </p>

        <h2>9 · Contacto</h2>
        <p>
          [PENDIENTE: razón social, RUC y domicilio del responsable]<br />
          Correo: <a href="mailto:soporte@willay.app">soporte@willay.app</a>
        </p>
      </div>
    </LayoutLegal>
  );
}
