import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard, 
  Package, 
  Truck, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Settings,
  Boxes,
  Building2,
  DollarSign,
  UserCheck,
  Menu,
  X,
} from 'lucide-react';

const translations = {
  es: {
    dashboard: 'Dashboard',
    catalog: 'Productos / Items',
    purchases: 'Compras',
    inventory: 'Inventario / Logística',
    pos: 'Punto de venta POS',
    hr: 'Personal / Asistencia',
    reports: 'Reportes / Ventas',
    settings: 'Configuración',
    logout: 'Cerrar Sesión',
    role: 'Rol',
    contacts: 'Clientes y Proveedores',
  },
  en: {
    dashboard: 'Dashboard',
    catalog: 'Products / Items',
    purchases: 'Purchases',
    inventory: 'Inventory & Logistics',
    pos: 'Point of sale POS',
    hr: 'Staff & Attendance',
    reports: 'Reports / Sales',
    settings: 'Settings',
    logout: 'Log Out',
    role: 'Role',
    contacts: 'Customers & Suppliers',
  }
};

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const t = translations[lang];

  // Desktop collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const isSystemAdmin = profile?.rol_sistema === 'sistema_admin';

  const menuItems = [
    {
      name: t.dashboard,
      path: '/admin',
      icon: LayoutDashboard,
      roles: ['admin'],
    },
    {
      name: t.catalog,
      path: '/admin/catalog',
      icon: Package,
      roles: ['admin'],
    },
    {
      name: t.purchases,
      path: '/admin/purchases',
      icon: Truck,
      roles: ['admin'],
    },
    {
      name: t.inventory,
      path: '/admin/inventory',
      icon: Boxes,
      roles: ['admin'],
    },
    {
      name: t.pos,
      path: '/pos',
      icon: ShoppingCart,
      roles: ['admin', 'cajero'],
    },
    {
      name: lang === 'es' ? 'Personal' : 'Staff',
      path: '/admin/staff',
      icon: Users,
      roles: ['admin'],
    },
    {
      name: t.reports,
      path: '/admin/reports',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      name: t.contacts,
      path: '/admin/customers',
      icon: UserCheck,
      roles: ['admin'],
    },
    {
      name: t.settings,
      path: '/admin/settings',
      icon: Settings,
      roles: ['admin'],
    },
    {
      name: lang === 'es' ? 'Aprobaciones Caja' : 'Cash Approvals',
      path: '/admin/cash-approvals',
      icon: DollarSign,
      roles: ['admin'],
    },
  ];

  if (isSystemAdmin) {
    menuItems.push({
      name: 'Gestionar Empresas',
      path: '/admin/empresas',
      icon: Building2,
      roles: ['admin'],
    });
  }

  const visibleMenuItems = menuItems.filter(
    (item) => !profile || item.roles.includes(profile.rol)
  );

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile} 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
        />
      )}

      <aside className={`bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 text-slate-700 shadow-sm z-40 transition-all duration-300 ${
        mobileOpen 
          ? 'fixed inset-y-0 left-0 w-64 translate-x-0' 
          : 'max-md:-translate-x-full md:translate-x-0'
      } ${
        isCollapsed ? 'md:w-20' : 'md:w-64'
      }`}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          
          {/* Brand Logo Header & Hamburger Menu Button */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 min-h-[64px]">
            {isCollapsed && !mobileOpen ? (
              /* Collapsed state: Centered logo image that acts as toggle button */
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer group"
                title={lang === 'es' ? 'Expandir menú' : 'Expand menu'}
              >
                <img src="/logo.png" alt="Aura" className="w-9 h-9 object-contain rounded-lg shrink-0 group-hover:scale-105 transition-transform" />
              </button>
            ) : (
              /* Expanded state: Logo + Title + Hamburger Button */
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img src="/logo.png" alt="Aura" className="w-9 h-9 object-contain rounded-lg shrink-0" />
                  <span className="font-extrabold text-xl text-slate-900 tracking-tight truncate">Aura</span>
                </div>

                {/* Desktop Hamburger Toggle Button */}
                <button
                  onClick={toggleSidebar}
                  className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
                  title={lang === 'es' ? 'Colapsar menú' : 'Collapse menu'}
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>

                {/* Mobile Close Button */}
                <button
                  onClick={onCloseMobile}
                  className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className={`flex-1 py-6 space-y-1 ${isCollapsed ? 'md:px-3 px-4' : 'px-4'}`}>
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center transition-all ${
                      isCollapsed 
                        ? 'md:justify-center p-3 rounded-xl' 
                        : 'gap-3 px-4 py-3 rounded-xl text-sm font-semibold'
                    } ${
                      isActive
                        ? 'bg-slate-100/80 text-slate-900 border border-slate-200/50 shadow-sm'
                        : 'hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 transition-colors shrink-0" />
                  {(!isCollapsed || mobileOpen) && <span className="truncate text-sm font-semibold">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Spacer / Collapse Button */}
        <div className="p-3 border-t border-slate-100 hidden md:flex justify-center">
          <button
            onClick={toggleSidebar}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            {!isCollapsed && <span>{lang === 'es' ? 'Menú' : 'Menu'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
