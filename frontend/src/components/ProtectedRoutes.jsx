import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedPatientRoute = () => {
  const { isAuthenticated, isDoctor, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (isDoctor || isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export const ProtectedAdminRoute = () => {
  const { isAuthenticated, isDoctor, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || (!isAdmin && !isDoctor)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};
