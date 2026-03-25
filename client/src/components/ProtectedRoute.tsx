import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type AuthUser } from '../context/AuthContext';

interface ProtectedRouteProps {
  role: AuthUser['role'];
}

export default function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
