import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { MobileMeasurement } from './pages/MobileMeasurement';
import { Measurements } from './pages/Measurements';
import { NewMeasurement } from './pages/NewMeasurement';
import { ImportMeasurements } from './pages/ImportMeasurements';
import { MeasurementDetail } from './pages/MeasurementDetail';
import { Profile } from './pages/Profile';
import { AdminMeasurementTypes } from './pages/AdminMeasurementTypes';
import { AdminUsers } from './pages/AdminUsers';
import { AdminAlertTemplates } from './pages/AdminAlertTemplates';
import { AdminAssociations } from './pages/AdminAssociations';
import { AdminContracts } from './pages/AdminContracts';
import { AdminContractReport } from './pages/AdminContractReport';
import { DoctorPatients } from './pages/DoctorPatients';
import { DoctorAlerts } from './pages/DoctorAlerts';
import { DoctorContractStatus } from './pages/DoctorContractStatus';
import { Notifications } from './pages/Notifications';
import { VerifyEmail } from './pages/VerifyEmail';
import { Privacy } from './pages/Privacy';

const queryClient = new QueryClient();

function RootRedirect() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  if (user?.role === 'doctor') return <Navigate to="/doctor/patients" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/users" replace />;
  if (user?.role === 'patient' && !searchParams.has('full')) {
    return <Navigate to="/measurements/mobile" replace />;
  }
  return <Dashboard />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route element={<Layout />}>
              <Route path="/privacy" element={<Privacy />} />
              <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/measurements" element={<Measurements />} />
                <Route path="/measurements/new" element={<NewMeasurement />} />
                <Route path="/measurements/import" element={<ImportMeasurements />} />
                <Route path="/measurements/:id" element={<MeasurementDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin/measurement-types" element={<ProtectedRoute roles={['admin']}><AdminMeasurementTypes /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin/alert-templates" element={<ProtectedRoute roles={['admin']}><AdminAlertTemplates /></ProtectedRoute>} />
                <Route path="/admin/associations" element={<ProtectedRoute roles={['admin']}><AdminAssociations /></ProtectedRoute>} />
                <Route path="/admin/contracts" element={<ProtectedRoute roles={['admin']}><AdminContracts /></ProtectedRoute>} />
                <Route path="/admin/contracts/report" element={<ProtectedRoute roles={['admin']}><AdminContractReport /></ProtectedRoute>} />
                <Route path="/doctor/patients" element={<ProtectedRoute roles={['doctor']}><DoctorPatients /></ProtectedRoute>} />
                <Route path="/doctor/alerts" element={<ProtectedRoute roles={['doctor']}><DoctorAlerts /></ProtectedRoute>} />
                <Route path="/doctor/contract" element={<ProtectedRoute roles={['doctor']}><DoctorContractStatus /></ProtectedRoute>} />
              </Route>
            </Route>
            <Route path="/measurements/mobile" element={<ProtectedRoute roles={['patient']}><MobileMeasurement /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
