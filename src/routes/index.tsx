import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Login } from '../features/auth/Login.tsx';
import { ResetPassword } from '../features/auth/ResetPassword.tsx';
import { AdminDashboard, BarberDashboard } from '../features/auth/RoleDashboards.tsx';
import { AdminLayout } from '../components/AdminLayout.tsx';
import { CatalogManager } from '../features/catalog/CatalogManager.tsx';
import { PurchaseManager } from '../features/purchases/PurchaseManager.tsx';
import { SalesReport } from '../features/reports/SalesReport.tsx';
import { CloseReport } from '../features/reports/CloseReport.tsx';
import { POSTerminal } from '../features/pos/POSTerminal.tsx';
import { SettingsManager } from '../features/settings/SettingsManager.tsx';
import { InventoryManager } from '../features/inventory/InventoryManager.tsx';
import { EmpresaManager } from '../features/admin/EmpresaManager.tsx';
import { CashApprovals } from '../features/cash/CashApprovals.tsx';
import { CustomerManager } from '../features/customers/CustomerManager.tsx';
import { StaffManager } from '../features/staff/StaffManager.tsx';
import { CloseTurnPage } from '../features/cash/CloseTurnPage.tsx';
import { TikTokCRMPage } from '../features/crm/TikTokCRMPage.tsx';

import { LandingPage } from '../features/landing/LandingPage.tsx';
import { TermsOfService } from '../features/legal/TermsOfService.tsx';
import { PrivacyPolicy } from '../features/legal/PrivacyPolicy.tsx';

export const AppRoutes: React.FC = () => {
  const { user, profile } = useAuth();

  const getRedirectPath = () => {
    if (!profile) return '/login';
    if (profile.rol_sistema === 'sistema_admin') return '/admin';
    if (profile.rol === 'admin' || profile.rol === 'jefe') return '/admin';
    if (profile.rol === 'cajero' || profile.rol === 'mesero' || profile.rol === 'asistente') return '/pos';
    if (profile.rol === 'barbero') return '/barber';
    return '/login';
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={<LandingPage />} 
      />
      <Route 
        path="/terms" 
        element={<TermsOfService />} 
      />
      <Route 
        path="/terminos" 
        element={<Navigate to="/terms" replace />} 
      />
      <Route 
        path="/terms-of-service" 
        element={<Navigate to="/terms" replace />} 
      />
      <Route 
        path="/privacy" 
        element={<PrivacyPolicy />} 
      />
      <Route 
        path="/privacidad" 
        element={<Navigate to="/privacy" replace />} 
      />
      <Route 
        path="/privacy-policy" 
        element={<Navigate to="/privacy" replace />} 
      />
      <Route 
        path="/login" 
        element={user ? <Navigate to={getRedirectPath()} replace /> : <Login />} 
      />
      <Route 
        path="/reset-password" 
        element={user ? <Navigate to={getRedirectPath()} replace /> : <ResetPassword />} 
      />

      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<AdminDashboard />} />
        <Route path="catalog" element={<CatalogManager />} />
        <Route path="purchases" element={<PurchaseManager />} />
        <Route path="compras" element={<PurchaseManager />} />
        <Route path="reports" element={<Navigate to="ventas" replace />} />
        <Route path="reports/ventas" element={<SalesReport />} />
        <Route path="reports/turnos" element={<CloseReport />} />
        <Route path="settings" element={<SettingsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="empresas" element={<EmpresaManager />} />
        <Route path="cash-approvals" element={<CashApprovals />} />
        <Route path="staff" element={<StaffManager />} />
        <Route path="customers" element={<CustomerManager />} />
        <Route path="crm/tiktok" element={<TikTokCRMPage />} />
      </Route>

      <Route 
        path="/crm/tiktok" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'cajero']}>
            <AdminLayout />
          </ProtectedRoute>
        } 
      >
        <Route index element={<TikTokCRMPage />} />
      </Route>

      <Route 
        path="/pos" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'cajero']}>
            <POSTerminal />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pos/cierre" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'cajero']}>
            <CloseTurnPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/barber" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'barbero']}>
            <BarberDashboard />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="*" 
        element={<Navigate to={user ? getRedirectPath() : '/login'} replace />} 
      />
    </Routes>
  );
};
