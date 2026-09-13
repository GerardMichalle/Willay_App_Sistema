import LayoutLegal from '../../components/LayoutLegal';

/**
 * Página pública (sin sesión) — URL exigida por Google Play y por la Ley
 * N.º 29733. Contenido revisado contra el modelo de datos real del
 * sistema (backend/src/main/java/com/willay/entity), no genérico.
 *
 * Contacto: willaysoporte@gmail.com (aún sin razón social/RUC formales —
 * actualizar el pie de la página cuando la empresa quede constituida).
 */
export default function PoliticaPrivacidad() {
  return (
    <LayoutLegal titulo="Política de Privacidad" actualizado="13 de septiembre de 2026">
      <div className="legal-doc">
        <p className="aviso">
          Willay es la plataforma tecnológica que un colegio contrata para gestionar su
          asistencia, comunicación y registro académico. En términos de la Ley N.º 29733,
          Ley de Protección de Datos Personales del Perú, y su Reglamento (D.S. N.º 016-2024-JUS):
          <strong> el colegio es el titular del banco de datos personales</strong> de sus
          alumnos, apoderados y docentes, y <strong>Willay actúa como encargado del
          tratamiento</strong>, procesando esos datos únicamente por cuenta e instrucción del
          colegio, bajo un acuerdo escrito de encargo de tratamiento.
        </p>

        <h2>1 · Alcance</h2>
        <p>
          Esta política aplica al sitio web de Willay y a la aplicación móvil Willay para
          Android, usados por personal administrativo, docentes, alumnos y apoderados de los
          colegios que contratan la plataforma. Describe qué datos personales tratamos, con
          qué fin, por cuánto tiempo, con quién los compartimos y cómo puedes ejercer tus
          derechos sobre ellos.
        </p>

        <h2>2 · Qué datos recopilamos</h2>
        <p>Los datos que trata el sistema dependen del rol de cada persona:</p>
        <table>
          <thead>
            <tr><th>Perfil</th><th>Datos</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Alumno</td>
              <td>Nombres y apellidos, DNI, fecha de nacimiento, fotografía de perfil, grado y
                sección, código de estudiante, código de tarjeta RFID/QR de su credencial,
                registros de asistencia (hora y punto de acceso de entrada/salida), notas de
                conducta (méritos y observaciones), libretas y notas académicas.</td>
            </tr>
            <tr>
              <td>Apoderado (padre/madre/tutor)</td>
              <td>Nombres y apellidos, DNI, teléfono, correo electrónico, vínculo con el/los
                alumno(s) a su cargo, notificaciones de ingreso/salida de sus hijos.</td>
            </tr>
            <tr>
              <td>Docente / personal administrativo</td>
              <td>Nombres y apellidos, correo electrónico, rol dentro del colegio, aulas o
                cursos asignados, registros de actividad relevantes a su función (por ejemplo,
                quién registró una nota de conducta o publicó un comunicado).</td>
            </tr>
            <tr>
              <td>Cualquier usuario con cuenta</td>
              <td>Correo y contraseña (la contraseña se guarda cifrada, nunca en texto plano),
                fotografía de perfil opcional, historial de inicios de sesión, preferencias de
                notificación.</td>
            </tr>
          </tbody>
        </table>

        <h3>Datos específicos de la aplicación móvil</h3>
        <ul>
          <li><strong>Cámara:</strong> se usa únicamente para escanear el código QR de la
            credencial de un estudiante al registrar asistencia. La app no guarda fotos ni
            video de la cámara — solo lee el texto del código QR en el momento del escaneo.</li>
          <li><strong>Notificaciones push:</strong> si el usuario las activa, el dispositivo
            recibe un identificador de Firebase Cloud Messaging (FCM), usado exclusivamente
            para enviarle avisos del colegio (ingreso/salida de un hijo, comunicados). Este
            identificador no se usa para publicidad ni se comparte con anunciantes — Willay no
            muestra publicidad.</li>
          <li><strong>Almacenamiento local del dispositivo:</strong> la sesión iniciada y, en
            el caso del personal que usa el celular como lector de asistencia, la credencial
            del lector configurada y las lecturas de asistencia pendientes de sincronizar si el
            dispositivo se quedó sin conexión — todo esto se guarda solo en el propio
            dispositivo, no se envía a ningún tercero.</li>
        </ul>

        <h2>3 · Para qué usamos estos datos</h2>
        <ul>
          <li>Registrar y consultar la asistencia diaria (entrada/salida) de cada alumno.</li>
          <li>Notificar a los apoderados cuando su hijo ingresa o sale del colegio.</li>
          <li>Gestionar matrículas, aulas, cursos y el registro de conducta y libretas.</li>
          <li>Emitir la credencial digital/física del estudiante (código QR).</li>
          <li>Publicar y distribuir comunicados del colegio.</li>
          <li>Administrar cuentas de usuario, autenticación y control de acceso por rol.</li>
          <li>Generar reportes y estadísticas agregadas para la dirección del colegio.</li>
          <li>Mantener un registro de auditoría de acciones administrativas sensibles.</li>
        </ul>
        <p>Willay no usa estos datos con fines publicitarios ni los vende ni los cede a
          terceros para marketing.</p>

        <h2>4 · Base legal</h2>
        <p>
          El tratamiento se sustenta en el consentimiento otorgado por el colegio (como
          titular del banco de datos) al momento de la matrícula, conforme al Artículo 13 de la
          Ley N.º 29733, así como en la ejecución de la relación contractual entre el colegio y
          las familias, y en el cumplimiento de obligaciones vinculadas a la prestación del
          servicio educativo.
        </p>

        <h2>5 · Datos de niñas, niños y adolescentes</h2>
        <p>
          De acuerdo con el Artículo 22 del Reglamento de la Ley N.º 29733, el tratamiento de
          datos personales de menores de edad requiere el consentimiento de quien ejerce su
          patria potestad o tutela. Este consentimiento lo recaba el colegio directamente con
          el padre, madre o apoderado al momento de la matrícula — Willay no solicita ni recibe
          consentimiento directamente de los alumnos menores de edad, y no permite que un
          alumno cree su propia cuenta sin que el colegio la haya dado de alta primero.
        </p>
        <p>
          Los derechos sobre los datos de un menor (acceso, rectificación, cancelación,
          oposición) los ejerce su padre, madre o apoderado, directamente ante el colegio.
        </p>

        <h2>6 · Conservación de los datos</h2>
        <p>
          Los datos se conservan mientras el alumno, apoderado o docente mantenga vínculo
          activo con el colegio, y durante el plazo adicional que exija la normativa educativa
          o tributaria aplicable para la conservación de registros escolares. Cuando el colegio
          instruye la eliminación de un registro (por ejemplo, al retirarse un estudiante),
          Willay la ejecuta sobre los sistemas que administra.
        </p>

        <h2>7 · Con quién compartimos los datos</h2>
        <p>
          Willay no vende ni cede datos personales a terceros con fines comerciales. Para
          poder operar el servicio, sí se apoya en los siguientes encargados subcontratados,
          cada uno tratando datos únicamente para la función indicada:
        </p>
        <table>
          <thead>
            <tr><th>Proveedor</th><th>Función</th><th>Datos involucrados</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Servidor de alojamiento (infraestructura en la nube)</td>
              <td>Alojar la base de datos y el backend del sistema</td>
              <td>Todos los datos descritos en la sección 2</td>
            </tr>
            <tr>
              <td>Google Firebase Cloud Messaging</td>
              <td>Entregar notificaciones push a la app Android</td>
              <td>Identificador del dispositivo (token FCM), título y texto del aviso</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Envío de correos transaccionales (activación de cuenta, recuperación de
                contraseña)</td>
              <td>Correo electrónico, nombre</td>
            </tr>
          </tbody>
        </table>
        <p>
          Algunos de estos proveedores procesan datos en servidores fuera del Perú (transferencia
          internacional de datos personales), lo cual se realiza conforme al Artículo 15 de la
          Ley N.º 29733, exigiendo a cada proveedor garantías contractuales de protección
          adecuadas para los datos que procesa.
        </p>

        <h2>8 · Seguridad</h2>
        <ul>
          <li>Las contraseñas se almacenan cifradas (nunca en texto plano).</li>
          <li>Toda comunicación entre la app/web y el servidor viaja cifrada (HTTPS/TLS).</li>
          <li>El acceso a cada dato está limitado según el rol del usuario (un docente no ve
            lo mismo que un administrador; un apoderado solo ve a sus propios hijos).</li>
          <li>Las fotografías y documentos se sirven mediante enlaces firmados de corta
            duración, no URLs públicas permanentes.</li>
          <li>El código QR de la credencial no contiene datos personales — solo un
            identificador que únicamente tiene sentido dentro del sistema del colegio.</li>
        </ul>

        <h2>9 · Tus derechos (ARCO)</h2>
        <p>
          Como titular de tus datos personales (o, si eres el padre/madre/apoderado de un
          menor, en representación de este), tienes derecho a solicitar en cualquier momento:
        </p>
        <ul>
          <li><strong>Acceso:</strong> conocer qué datos tuyos (o de tu hijo/a) están registrados.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Cancelación:</strong> solicitar la eliminación de tus datos cuando ya no
            sean necesarios para la finalidad que los originó.</li>
          <li><strong>Oposición:</strong> oponerte a un tratamiento específico de tus datos.</li>
        </ul>
        <p>
          Para ejercer estos derechos, contacta primero a tu colegio (titular del banco de
          datos), o escríbenos directamente a{' '}
          <a href="mailto:willaysoporte@gmail.com">willaysoporte@gmail.com</a> y coordinaremos con el
          colegio correspondiente. Responderemos dentro de los plazos establecidos por la Ley
          N.º 29733 y su Reglamento.
        </p>

        <h2>10 · Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios en el sistema o en la
          normativa aplicable. La fecha de "Última actualización" en la parte superior indica
          la versión vigente. Cambios significativos se comunicarán a los colegios clientes.
        </p>

        <h2>11 · Contacto</h2>
        <p>
          Correo: <a href="mailto:willaysoporte@gmail.com">willaysoporte@gmail.com</a>
        </p>
      </div>
    </LayoutLegal>
  );
}
