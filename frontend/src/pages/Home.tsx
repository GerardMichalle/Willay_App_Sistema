import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import MiAula from './docente/MiAula';
import InicioAlumno from './portal/InicioAlumno';
import InicioPadre from './portal/InicioPadre';
import Colegios from './superadmin/Colegios';

/** El "Inicio" cambia según el rol: cada usuario ve lo que le importa. */
export default function Home() {
  const { usuario } = useAuth();
  switch (usuario?.rol) {
    case 'superadmin': return <Colegios />;
    case 'profesor': return <MiAula />;
    case 'alumno': return <InicioAlumno />;
    case 'apoderado': return <InicioPadre />;
    default: return <Dashboard />; // admin y dirección
  }
}
