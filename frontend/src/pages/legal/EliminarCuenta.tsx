import LayoutLegal from '../../components/LayoutLegal';

const ASUNTO = encodeURIComponent('Solicitud de eliminación de cuenta - Willay');
const CUERPO = encodeURIComponent(
  'Nombre completo:\nColegio:\nCorreo con el que inicio sesión en Willay:\n\n' +
  'Solicito la eliminación de mi cuenta y los datos asociados en Willay.',
);

/**
 * Página pública (sin sesión) — es el "web link resource" que exige la
 * política de eliminación de cuenta de Google Play, enlazada además desde
 * dentro de la app (Sidebar) para cumplir también la ruta "in-app".
 */
export default function EliminarCuenta() {
  return (
    <LayoutLegal titulo="Eliminar mi cuenta" actualizado="14 de septiembre de 2026">
      <div className="legal-doc">
        <p className="aviso">
          Puedes solicitar la eliminación de tu cuenta de Willay y de los datos personales
          asociados a ella en cualquier momento. Si eres el padre, madre o apoderado de un
          alumno menor de edad, puedes solicitar esto en representación de tu hijo/a.
        </p>

        <h2>1 · Quién puede solicitarlo</h2>
        <ul>
          <li>El propio titular de la cuenta (docente, personal administrativo, apoderado).</li>
          <li>El padre, madre o apoderado de un alumno menor de edad, en su representación.</li>
          <li>El colegio, como titular del banco de datos, también puede instruir directamente
            la baja de una cuenta.</li>
        </ul>

        <h2>2 · Qué se elimina</h2>
        <p>
          Tu cuenta de acceso (correo y contraseña), tu foto de perfil si subiste una, y los
          datos personales que Willay trata directamente sobre ti (ver la sección 2 de la{' '}
          <a href="/legal/privacidad">Política de Privacidad</a>).
        </p>
        <p>
          Como el colegio es el titular del banco de datos de sus alumnos, los registros
          académicos y de asistencia que forman parte del expediente escolar (notas, libretas,
          historial de asistencia) se eliminan cuando el colegio lo instruye, conforme a la
          normativa educativa que le exige conservar ciertos registros por un plazo mínimo —
          igual que ocurriría con el archivo físico de un estudiante.
        </p>

        <h2>3 · Plazo de respuesta</h2>
        <p>
          Procesamos toda solicitud dentro de los plazos establecidos por la Ley N.º 29733 de
          Protección de Datos Personales del Perú. Te confirmaremos por correo cuando la
          eliminación se haya completado.
        </p>

        <h2>4 · Cómo solicitarlo</h2>
        <p>
          Escríbenos directamente desde el correo con el que inicias sesión en Willay, indicando
          tu nombre completo y el colegio al que perteneces:
        </p>
        <p>
          <a
            href={`mailto:willaysoporte@gmail.com?subject=${ASUNTO}&body=${CUERPO}`}
            className="inline-flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white! no-underline! hover:bg-brand-strong transition-colors"
          >
            Solicitar por correo
          </a>
        </p>
        <p>
          También puedes pedirlo directamente a tu colegio, que puede dar de baja tu cuenta
          desde su propio panel de administración.
        </p>
      </div>
    </LayoutLegal>
  );
}
