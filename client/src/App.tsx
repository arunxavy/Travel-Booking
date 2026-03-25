import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import MemberLayout from './layouts/MemberLayout';
import OpsLayout from './layouts/OpsLayout';
import AdminLayout from './layouts/AdminLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Member routes */}
          <Route element={<ProtectedRoute role="member" />}>
            <Route path="/member/*" element={<MemberLayout />} />
          </Route>

          {/* Operations routes */}
          <Route element={<ProtectedRoute role="operations" />}>
            <Route path="/ops/*" element={<OpsLayout />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin/*" element={<AdminLayout />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
