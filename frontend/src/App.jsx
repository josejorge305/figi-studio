import { Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './utils/api';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Studio from './pages/Studio';

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  return !getToken() ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/studio/:projectId" element={<PrivateRoute><Studio /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
