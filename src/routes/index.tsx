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
import { POSTerminal } from '../features/pos/POSTerminal.tsx';
import { SettingsManager } from '../features/settings/SettingsManager.tsx';
import { InventoryManager } from '../features/inventory/InventoryManager.tsx';
import { EmpresaManager } from '../features/admin/EmpresaManager.tsx';
import { CashApprovals } from '../features/cash/CashApprovals.tsx';
import { CustomerManager } from '../features/customers/CustomerManager.tsx';
import { StaffManager } from '../features/staff/StaffManager.tsx';
import { CloseTurnPage } from '../features/cash/CloseTurnPage.tsx';

export const AppRoutes: React.FC = () => {
  const { user, profile } = useAuth();

  // Root redirect helper based on roles
  const getRedirectPath = () => {
    if (!profile) return '/login';
    if (profile.rol_sistema === 'sistema_admin') return '/admin';
    if (profile.rol === 'admin') return '/admin';
    if (profile.rol === 'cajero') return '/pos';
    if (profile.rol === 'barbero') return '/barber';
    return '/login';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={getRedirectPath()} replace /> : <Login />} 
      />
      <Route 
        path="/reset-password" 
        element={user ? <Navigate to={getRedirectPath()} replace /> : <ResetPassword />} 
      />

      {/* Protected Admin Routes (with Layout and Sidebar) */}
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
        <Route path="reports" element={<SalesReport />} />
        <Route path="settings" element={<SettingsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="empresas" element={<EmpresaManager />} />
        <Route path="cash-approvals" element={<CashApprovals />} />
        <Route path="staff" element={<StaffManager />} />
        <Route path="customers" element={<CustomerManager />} />
      </Route>

      {/* Other Protected Routes by Role */}
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

      {/* Fallback Catch All */}
      <Route 
        path="*" 
        element={<Navigate to={user ? getRedirectPath() : '/login'} replace />} 
      />
    </Routes>
  );
};
