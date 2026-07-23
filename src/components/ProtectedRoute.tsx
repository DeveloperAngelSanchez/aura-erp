import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'cajero' | 'barbero'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 tracking-wider">
            Cargando perfil
            <span className="animate-pulse">.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>.</span>
            <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>.</span>
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSistemaAdmin = profile?.rol_sistema === 'sistema_admin';

  if (allowedRoles && profile && !allowedRoles.includes(profile.rol) && !isSistemaAdmin) {
    if (profile.rol === 'admin') return <Navigate to="/admin" replace />;
    if (profile.rol === 'cajero') return <Navigate to="/pos" replace />;
    if (profile.rol === 'barbero') return <Navigate to="/barber" replace />;
  }

  return <>{children}</>;
};
