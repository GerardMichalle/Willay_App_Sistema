import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './layouts/AppLayout';
import Protegida from './components/Protegida';
import Login from './pages/Login';
import ActivarCuenta from './pages/ActivarCuenta';
import RecuperarContrasena from './pages/RecuperarContrasena';
import Home from './pages/Home';
import Alumnos from './pages/academico/Alumnos';
import Aulas from './pages/academico/Aulas';
import VincularTarjetas from './pages/academico/VincularTarjetas';
import Colegios from './pages/superadmin/Colegios';
import Matriculas from './pages/academico/Matriculas';
import Apoderados from './pages/academico/Apoderados';
import Docentes from './pages/academico/Docentes';
import Conducta from './pages/academico/Conducta';
import ControlVivo from './pages/asistencia/ControlVivo';
import Historial from './pages/asistencia/Historial';
import Comunicados from './pages/comunicacion/Comunicados';
import CursosGratuitos from './pages/cursos/CursosGratuitos';
import Libretas from './pages/docente/Libretas';
import Reportes from './pages/analisis/Reportes';
import Estadisticas from './pages/analisis/Estadisticas';
import Usuarios from './pages/sistema/Usuarios';
import Roles from './pages/sistema/Roles';
import Configuracion from './pages/sistema/Configuracion';
import Libreta from './pages/portal/Libreta';
import MiPerfil from './pages/portal/MiPerfil';

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activar" element={<ActivarCuenta />} />
          <Route path="/recuperar" element={<RecuperarContrasena />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />

            {/* Gestión: admin y dirección */}
            <Route path="/matriculas" element={<Protegida roles={['admin', 'direccion']}><Matriculas /></Protegida>} />
            <Route path="/alumnos" element={<Protegida roles={['admin', 'direccion']}><Alumnos /></Protegida>} />
            <Route path="/aulas" element={<Protegida roles={['admin', 'direccion']}><Aulas /></Protegida>} />
            <Route path="/vincular-tarjetas" element={<Protegida roles={['admin']}><VincularTarjetas /></Protegida>} />
            <Route path="/apoderados" element={<Protegida roles={['admin', 'direccion']}><Apoderados /></Protegida>} />
            <Route path="/docentes" element={<Protegida roles={['admin', 'direccion']}><Docentes /></Protegida>} />

            {/* Asistencia */}
            <Route path="/asistencia/vivo" element={<Protegida roles={['admin', 'direccion', 'profesor']}><ControlVivo /></Protegida>} />
            <Route path="/asistencia/historial" element={<Historial />} />

            {/* Formación */}
            <Route path="/conducta" element={<Protegida roles={['admin', 'direccion', 'profesor']}><Conducta /></Protegida>} />
            <Route path="/cursos" element={<CursosGratuitos />} />
            <Route path="/libretas" element={<Protegida roles={['profesor']}><Libretas /></Protegida>} />

            {/* Comunicación */}
            <Route path="/comunicados" element={<Comunicados />} />

            {/* Análisis: admin y dirección */}
            <Route path="/reportes" element={<Protegida roles={['admin', 'direccion']}><Reportes /></Protegida>} />
            <Route path="/estadisticas" element={<Protegida roles={['admin', 'direccion']}><Estadisticas /></Protegida>} />

            {/* Panel del proveedor: SOLO super admin */}
            <Route path="/colegios" element={<Protegida roles={['superadmin']}><Colegios /></Protegida>} />

            {/* Sistema: SOLO administrador */}
            <Route path="/usuarios" element={<Protegida roles={['admin']}><Usuarios /></Protegida>} />
            <Route path="/roles" element={<Protegida roles={['admin']}><Roles /></Protegida>} />
            <Route path="/configuracion" element={<Protegida roles={['admin']}><Configuracion /></Protegida>} />

            {/* Portal alumno / apoderado */}
            <Route path="/libreta" element={<Protegida roles={['alumno', 'apoderado', 'admin', 'direccion']}><Libreta /></Protegida>} />
            <Route path="/mi-perfil" element={<Protegida roles={['alumno']}><MiPerfil /></Protegida>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
      </ConfirmProvider>
    </AuthProvider>
  );
}
