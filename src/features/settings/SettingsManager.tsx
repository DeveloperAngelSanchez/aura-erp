import React, { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  Settings, 
  Coins, 
  Terminal, 
  UserPlus, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Plus,
  Users
} from 'lucide-react';

const translations = {
  es: {
    title: 'Configuración de la Sucursal',
    subtitle: 'Administra las reglas de negocio, el POS, los tickets y el personal de esta sucursal.',
    successSave: '¡Configuraciones guardadas con éxito!',
    errorSave: 'Error al guardar las configuraciones.',
    loadingConfig: 'Cargando configuración...',
    
    // Bloque 1
    bizSection: 'Ajustes Comerciales y Financieros',
    bizDesc: 'Establece los formatos de moneda, impuestos y la comisión por defecto para los servicios.',
    currencySymbol: 'Símbolo de Moneda',
    decimals: 'Decimales en Visualización',
    decimals0: 'Sin decimales (ej: $150)',
    decimals2: 'Con 2 decimales (ej: $150.00)',
    defaultCommission: 'Comisión Base de Barberos (%)',
    commissionHelp: 'Comisión por defecto asignada al vender servicios (puede sobrescribirse en el perfil del barbero).',
    generalTax: 'Impuesto General (%)',
    taxHelp: 'Porcentaje de impuesto aplicable a los tickets de venta (IVA/IGV).',
    
    // Bloque 2
    posSection: 'Ajustes del POS y Control de Caja',
    posDesc: 'Define los límites operativos de dinero en efectivo y los métodos de pago habilitados.',
    cashLimit: 'Límite de Efectivo en Caja',
    cashLimitHelp: 'Alerta visual cuando el efectivo en la caja registradora supera este monto.',
    paymentMethods: 'Métodos de Pago Permitidos',
    paymentMethodsFav: 'Selecciona hasta 3 Favoritos para el POS',
    addPaymentBtn: 'Agregar Método',
    paymentNamePlaceholder: 'Ej. Yape, Plin, etc.',
    staffListTitle: 'Listado de Personal y Comisiones',
    editCommission: 'Editar Comisión',
    individualCommission: 'Comisión Individual (%)',
    
    // Bloque 3
    ticketSection: 'Impresión y Diseño del Ticket',
    ticketDesc: 'Configura la información comercial e institucional que aparecerá en los comprobantes de venta.',
    bizName: 'Razón Social / Nombre Comercial',
    taxId: 'Identificación Fiscal (RUC/NIT/RFC)',
    phone: 'Teléfono de Contacto',
    ticketHeader: 'Encabezado del Ticket',
    ticketFooter: 'Pie de Página del Ticket',
    
    // Bloque 4
    staffSection: 'Creación de Personal',
    staffDesc: 'Registra de manera segura cajeros o barberos en esta sucursal.',
    fullName: 'Nombre Completo',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    role: 'Rol del Empleado',
    cajero: 'Cajero / Recepcionista',
    barbero: 'Barbero / Estilista',
    admin: 'Administrador',
    createStaffBtn: 'Registrar Empleado',
    creatingStaff: 'Registrando...',
    successCreateStaff: '¡Empleado registrado con éxito en el sistema!',
    errorCreateStaff: 'Error al registrar el empleado.',
    commissionBarber: 'Comisión del Barbero (%)',
    
    // Botón
    saveBtn: 'Guardar Ajustes',
    savingBtn: 'Guardando...',
  },
  en: {
    title: 'Branch Settings',
    subtitle: 'Manage business rules, POS, tickets, and staff for this branch.',
    successSave: 'Settings saved successfully!',
    errorSave: 'Failed to save settings.',
    loadingConfig: 'Loading settings...',
    
    // Bloque 1
    bizSection: 'Commercial & Financial Settings',
    bizDesc: 'Set currency formats, default tax percentages, and barber commissions.',
    currencySymbol: 'Currency Symbol',
    decimals: 'Decimal Places',
    decimals0: 'No decimals (e.g. $150)',
    decimals2: '2 decimal places (e.g. $150.00)',
    defaultCommission: 'Default Barber Commission (%)',
    commissionHelp: 'Default commission percentage when selling services (can be overridden in individual profile).',
    generalTax: 'General Tax (%)',
    taxHelp: 'Tax percentage applied to sales tickets (VAT/GST).',
    
    // Bloque 2
    posSection: 'POS & Cash Drawer Settings',
    posDesc: 'Set drawer cash limits and configure enabled payment methods.',
    cashLimit: 'Max Cash Limit in Drawer',
    cashLimitHelp: 'Visual alert triggered when the cash amount in the register exceeds this threshold.',
    paymentMethods: 'Enabled Payment Methods',
    paymentMethodsFav: 'Select up to 3 Favorites for the POS',
    addPaymentBtn: 'Add Method',
    paymentNamePlaceholder: 'E.g. Yape, Plin, etc.',
    staffListTitle: 'Staff List & Commissions',
    editCommission: 'Edit Commission',
    individualCommission: 'Individual Commission (%)',
    
    // Bloque 3
    ticketSection: 'Ticket Layout & Receipt Design',
    ticketDesc: 'Configure the business information and notes printed on sales receipts.',
    bizName: 'Business / Trade Name',
    taxId: 'Tax Identification Number',
    phone: 'Contact Phone Number',
    ticketHeader: 'Ticket Header Text',
    ticketFooter: 'Ticket Footer Text',
    
    // Bloque 4
    staffSection: 'Staff Creation',
    staffDesc: 'Securely register cashiers or barbers for this branch.',
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    role: 'Employee Role',
    cajero: 'Cashier / Receptionist',
    barbero: 'Barber / Stylist',
    admin: 'Administrator',
    createStaffBtn: 'Register Employee',
    creatingStaff: 'Registering...',
    successCreateStaff: 'Employee registered successfully in the system!',
    errorCreateStaff: 'Failed to register employee.',
    commissionBarber: 'Barber Commission (%)',
    
    // Botón
    saveBtn: 'Save Settings',
    savingBtn: 'Saving...',
  }
};

export const SettingsManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { config, updateConfig, loading: settingsLoading } = useSettings();
  const t = translations[lang];

  // Config State
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [monedaSimbolo, setMonedaSimbolo] = useState('$');
  const [monedaDecimales, setMonedaDecimales] = useState(2);
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0);
  const [comisionBaseServicio, setComisionBaseServicio] = useState(0);
  const [limiteEfectivoCaja, setLimiteEfectivoCaja] = useState(500);
  const [ticketCorrelativoInicial, setTicketCorrelativoInicial] = useState(1);
  
  // Métodos de pago dinámicos
  const [metodosPago, setMetodosPago] = useState<string[]>([]);
  const [metodosFavoritos, setMetodosFavoritos] = useState<string[]>([]);
  const [nuevoMetodo, setNuevoMetodo] = useState('');
  
  // Ticket fields
  const [ticketNombre, setTicketNombre] = useState('');
  const [ticketRuc, setTicketRuc] = useState('');
  const [ticketEncabezado, setTicketEncabezado] = useState('');
  const [ticketPie, setTicketPie] = useState('');

  // Staff List & Creation State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffNombre, setStaffNombre] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRol, setStaffRol] = useState<'admin' | 'cajero' | 'barbero'>('barbero');
  const [staffComision, setStaffComision] = useState<string>('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffMessage, setStaffMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Staff List
  const loadStaffList = async () => {
    if (!profile?.sucursal_id) return;
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('sucursal_id', profile.sucursal_id)
        .order('nombre', { ascending: true });

      if (!error && data) {
        setStaffList(data);
      }
    } catch (e) {
      console.error('Error loading staff list:', e);
    }
  };

  // Sync state with Context Config when loaded
  useEffect(() => {
    if (config) {
      setMonedaSimbolo(config.moneda_simbolo || '$');
      setMonedaDecimales(config.moneda_decimales ?? 2);
      setImpuestoPorcentaje(Number(config.impuesto_porcentaje) || 0);
      setComisionBaseServicio(Number(config.comision_barbero_default) || 0);
      setLimiteEfectivoCaja(Number(config.limite_efectivo_caja) || 500);
      setTicketCorrelativoInicial(Number(config.ticket_correlativo_inicial) || 1);
      setMetodosPago(config.metodos_pago || ['efectivo', 'tarjeta', 'transferencia']);
      setMetodosFavoritos(config.metodos_pago_favoritos || ['efectivo', 'tarjeta', 'transferencia']);
      setTicketEncabezado(config.ticket_encabezado || '');
      setTicketPie(config.ticket_pie || '');
    }
  }, [config]);

  // Load Sucursal Name & Staff List
  useEffect(() => {
    const loadSucursalDetails = async () => {
      if (!profile?.sucursal_id) return;
      try {
        const { data: sucursalData, error: sucursalError } = await supabase
          .from('sucursales')
          .select('nombre, direccion')
          .eq('id', profile.sucursal_id)
          .single();

        if (!sucursalError && sucursalData) {
          setTicketNombre(sucursalData.nombre || '');
          setTicketRuc(sucursalData.direccion || '');
        }

        await loadStaffList();
      } catch (err) {
        console.error('Error loading sucursal details:', err);
      }
    };

    loadSucursalDetails();
  }, [profile]);

  // Save Configurations
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.sucursal_id) return;

    setSaving(true);
    setMessage(null);

    try {
      // Guardar configuraciones en Supabase & Contexto
      const success = await updateConfig({
        moneda_simbolo: monedaSimbolo,
        moneda_decimales: Number(monedaDecimales),
        impuesto_porcentaje: Number(impuestoPorcentaje),
        comision_barbero_default: Number(comisionBaseServicio),
        limite_efectivo_caja: Number(limiteEfectivoCaja),
        ticket_correlativo_inicial: Number(ticketCorrelativoInicial),
        metodos_pago: metodosPago,
        metodos_pago_favoritos: metodosFavoritos,
        ticket_encabezado: ticketEncabezado,
        ticket_pie: ticketPie,
      });

      if (!success) throw new Error(t.errorSave);

      // Actualizar datos de la sucursal (Razón social / RUC)
      await supabase
        .from('sucursales')
        .update({
          nombre: ticketNombre,
          direccion: ticketRuc,
        })
        .eq('id', profile.sucursal_id);

      setMessage({ type: 'success', text: t.successSave });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: err.message || t.errorSave });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // Agregar nuevo método de pago dinámico
  const handleAddPaymentMethod = () => {
    if (!nuevoMetodo.trim()) return;
    const cleanMethod = nuevoMetodo.trim().toLowerCase();
    if (metodosPago.includes(cleanMethod)) return;
    
    setMetodosPago([...metodosPago, cleanMethod]);
    setNuevoMetodo('');
  };

  // Eliminar método de pago dinámico
  const handleRemovePaymentMethod = (method: string) => {
    if (metodosPago.length <= 1) {
      alert(lang === 'es' ? 'Debes tener al menos un método de pago.' : 'You must keep at least one payment method.');
      return;
    }
    setMetodosPago(metodosPago.filter(m => m !== method));
    setMetodosFavoritos(metodosFavoritos.filter(m => m !== method));
  };

  // Alternar favoritos (máximo 3)
  const handleToggleFavorito = (method: string) => {
    if (metodosFavoritos.includes(method)) {
      setMetodosFavoritos(metodosFavoritos.filter(m => m !== method));
    } else {
      if (metodosFavoritos.length >= 3) {
        alert(lang === 'es' ? 'Solo puedes marcar un máximo de 3 favoritos.' : 'You can select a maximum of 3 favorites.');
        return;
      }
      setMetodosFavoritos([...metodosFavoritos, method]);
    }
  };

  // Actualizar comisión de barbero en línea
  const handleUpdateStaffCommission = async (staffId: string, value: string) => {
    const numVal = value === '' ? null : Number(value);
    if (numVal !== null && (numVal < 0 || numVal > 100)) return;

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ comision_porcentaje: numVal })
        .eq('id', staffId);

      if (error) throw error;
      await loadStaffList();
    } catch (e) {
      console.error('Error updating staff commission:', e);
    }
  };

  // Handle Staff Onboarding (Calling Deno Edge Function)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.sucursal_id) return;

    setStaffLoading(true);
    setStaffMessage(null);

    try {
      const { error: fnError } = await supabase.functions.invoke('crear-empleado', {
        body: {
          email: staffEmail,
          password: staffPassword,
          nombre: staffNombre,
          rol: staffRol,
          sucursal_id: profile.sucursal_id,
          comision_porcentaje: staffRol === 'barbero' && staffComision !== '' ? Number(staffComision) : null,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || t.errorCreateStaff);
      }

      setStaffMessage({ type: 'success', text: t.successCreateStaff });
      
      // Reset Form fields
      setStaffNombre('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffRol('barbero');
      setStaffComision('');

      // Reload staff list
      await loadStaffList();

      setTimeout(() => setStaffMessage(null), 5000);
    } catch (err: any) {
      console.error('Error onboarding staff:', err);
      setStaffMessage({ type: 'error', text: err.message || t.errorCreateStaff });
    } finally {
      setStaffLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-semibold">{t.loadingConfig}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-8 bg-slate-50 max-w-6xl mx-auto overflow-y-auto">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-2xl">{t.subtitle}</p>
        </div>
      </div>

      {/* Main Alert Banner */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
            : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-semibold">{message.text}</span>
        </div>
      )}

      {/* Layout Grid: 2/3 Configs - 1/3 Staff Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Formulario One-Page Configs (Columnas 1 y 2) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-2 space-y-8">
          
          {/* Bloque 1: Ajustes Comerciales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.bizSection}</h3>
                <p className="text-[11px] text-slate-400">{t.bizDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Símbolo de moneda */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.currencySymbol}
                </label>
                <select
                  value={monedaSimbolo}
                  onChange={(e) => setMonedaSimbolo(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm bg-white"
                >
                  <option value="$">$ (USD)</option>
                  <option value="S/.">S/. (PEN)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="MXN">MXN ($)</option>
                </select>
              </div>

              {/* Decimales */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.decimals}
                </label>
                <select
                  value={monedaDecimales}
                  onChange={(e) => setMonedaDecimales(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm bg-white"
                >
                  <option value={0}>{t.decimals0}</option>
                  <option value={2}>{t.decimals2}</option>
                </select>
              </div>

              {/* Comisión Base */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.defaultCommission}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={comisionBaseServicio}
                  onChange={(e) => setComisionBaseServicio(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t.commissionHelp}</p>
              </div>

              {/* Impuesto base */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.generalTax}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={impuestoPorcentaje}
                  onChange={(e) => setImpuestoPorcentaje(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t.taxHelp}</p>
              </div>
            </div>
          </div>

          {/* Bloque 2: POS y Caja */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.posSection}</h3>
                <p className="text-[11px] text-slate-400">{t.posDesc}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Límite de efectivo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.cashLimit} ({monedaSimbolo})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={limiteEfectivoCaja}
                    onChange={(e) => setLimiteEfectivoCaja(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t.cashLimitHelp}</p>
                </div>

                {/* Correlativo Inicial para el Ticket */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {lang === 'es' ? 'Correlativo Inicial para el Ticket' : 'Initial Ticket Number'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={ticketCorrelativoInicial}
                    onChange={(e) => setTicketCorrelativoInicial(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {lang === 'es' 
                      ? 'Número inicial desde el cual se generarán los correlativos autoincrementables de 8 dígitos (ej. 00000001, 00000100).' 
                      : 'Initial number from which 8-digit auto-increment ticket IDs are generated.'}
                  </p>
                </div>
              </div>

              {/* Métodos de pago permitidos y favoritos */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.paymentMethods}
                </label>
                
                {/* Agregar nuevo método */}
                <div className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={nuevoMetodo}
                    onChange={(e) => setNuevoMetodo(e.target.value)}
                    placeholder={t.paymentNamePlaceholder}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-xs font-medium bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddPaymentMethod}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addPaymentBtn}</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {t.paymentMethodsFav}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                  {metodosPago.map((method) => {
                    const isFav = metodosFavoritos.includes(method);
                    return (
                      <div 
                        key={method}
                        className={`flex items-center justify-between px-4 py-2.5 border rounded-xl bg-white shadow-sm transition-all duration-200 ${
                          isFav ? 'border-blue-200 bg-blue-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isFav}
                            onChange={() => handleToggleFavorito(method)}
                            className="w-4 h-4 rounded text-blue-600 border-slate-350 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800 capitalize">{method}</span>
                          {isFav && (
                            <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              ★ POS
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePaymentMethod(method)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Datos de Impresión del Ticket (Comentado temporalmente) */}
          {/* 
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.ticketSection}</h3>
                <p className="text-[11px] text-slate-400">{t.ticketDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.bizName}
                </label>
                <input
                  type="text"
                  required
                  value={ticketNombre}
                  onChange={(e) => setTicketNombre(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.taxId}
                </label>
                <input
                  type="text"
                  value={ticketRuc}
                  onChange={(e) => setTicketRuc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.phone}
                </label>
                <input
                  type="text"
                  value={ticketTelefono}
                  onChange={(e) => setTicketTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.ticketHeader}
                </label>
                <textarea
                  rows={3}
                  value={ticketEncabezado}
                  onChange={(e) => setTicketEncabezado(e.target.value)}
                  placeholder="Bienvenidos a..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-sans"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.ticketFooter}
                </label>
                <textarea
                  rows={3}
                  value={ticketPie}
                  onChange={(e) => setTicketPie(e.target.value)}
                  placeholder="Gracias por su preferencia..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-sans"
                />
              </div>
            </div>
          </div>
          */}

          {/* Botón Guardar Cambios */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.savingBtn}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t.saveBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Bloque 4: Creación de Empleados (Columna 3) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.staffSection}</h3>
                <p className="text-[11px] text-slate-400">{t.staffDesc}</p>
              </div>
            </div>

            {/* Notification creation message */}
            {staffMessage && (
              <div className={`p-3 rounded-lg border text-xs font-semibold ${
                staffMessage.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {staffMessage.text}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              {/* Nombre completo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.fullName}
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={staffNombre}
                  onChange={(e) => setStaffNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>

              {/* Correo Electrónico */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.password}
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  {t.role}
                </label>
                <select
                  value={staffRol}
                  onChange={(e) => setStaffRol(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm bg-white"
                >
                  <option value="barbero">{t.barbero}</option>
                  <option value="cajero">{t.cajero}</option>
                  <option value="admin">{t.admin}</option>
                </select>
              </div>

              {/* Comisión Individual (Solo si es barbero) */}
              {staffRol === 'barbero' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.commissionBarber}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder={`${comisionBaseServicio}%`}
                      value={staffComision}
                      onChange={(e) => setStaffComision(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              )}

              {/* Botón Crear */}
              <button
                type="submit"
                disabled={staffLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/25 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                {staffLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.creatingStaff}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>{t.createStaffBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Listado de Personal y Comisiones */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.staffListTitle}</h3>
                <p className="text-[11px] text-slate-400">
                  {lang === 'es' ? 'Define comisiones específicas. Vacío = Comisión General.' : 'Set individual commission rates. Empty = Default Commission.'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto space-y-3 pr-1">
              {staffList.map((emp) => (
                <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{emp.nombre}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{emp.email || '—'}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold border uppercase tracking-wider ${
                      emp.rol === 'admin' 
                        ? 'bg-rose-50 text-rose-700 border-rose-100' 
                        : emp.rol === 'cajero' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {emp.rol === 'admin' ? t.admin : emp.rol === 'cajero' ? t.cajero : t.barbero}
                    </span>
                  </div>

                  {emp.rol === 'barbero' && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="relative max-w-[100px]">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder={`${comisionBaseServicio}%`}
                          value={emp.comision_porcentaje !== null && emp.comision_porcentaje !== undefined ? emp.comision_porcentaje : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStaffList(prev => prev.map(item => item.id === emp.id ? { ...item, comision_porcentaje: val === '' ? null : Number(val) } : item));
                          }}
                          onBlur={(e) => handleUpdateStaffCommission(emp.id, e.target.value)}
                          className="w-full pl-3 pr-6 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono font-bold text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
