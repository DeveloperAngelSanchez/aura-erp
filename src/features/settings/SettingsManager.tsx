import React, { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { useEmpresa } from '../../context/EmpresaContext';
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
  Users,
  Utensils,
  Receipt,
  Eye,
  EyeOff,
  QrCode,
  Printer,
  Building2,
  Info,
} from 'lucide-react';

const translations = {
  es: {
    title: 'Configuración de la Sucursal',
    subtitle: 'Administra las reglas de negocio, el POS, los tickets y el personal de esta sucursal.',
    successSave: '¡Configuraciones guardadas con éxito!',
    errorSave: 'Error al guardar las configuraciones.',
    loadingConfig: 'Cargando configuración...',
    
    // Bloque Empresa
    empresaSection: 'Datos de la Empresa / Sucursal',
    empresaDesc: 'Configura la información fiscal y de contacto que aparecerá en la cabecera de los comprobantes impresos y digitales.',
    empresaNombre: 'Razón Social / Nombre Comercial',
    empresaRuc: 'R.U.C. / Identificación Fiscal (11 dígitos)',
    empresaDireccion: 'Dirección Fiscal / Comercial',
    empresaTelefono: 'Teléfono de Contacto',

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
    ticketDesc: 'Configura los mensajes y el diseño visual de los comprobantes.',
    ticketHeader: 'Mensaje Adicional en Encabezado (Opcional)',
    ticketHeaderHelp: 'Texto de bienvenida o anuncio secundario que aparecerá debajo de los Datos de la Empresa.',
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
    
    // Ticket Digital
    ticketDigitalSection: 'Ticket Digital & Comprobantes',
    ticketDigitalDesc: 'Activa la visualización del ticket digital en formato PDF al finalizar cada venta en el POS.',
    ticketDigitalToggle: 'Ver Ticket Digital',
    ticketDigitalToggleDesc: 'Muestra automáticamente el ticket en formato térmico al finalizar cada venta.',
    ticketAncho: 'Ancho de Impresión',
    ticketAncho80: '80mm (Área imprimible: ~72mm)',
    ticketAncho58: '58mm (Área imprimible: ~48mm)',
    ticketSerie: 'Prefijo de Serie',
    ticketSerieHelp: 'Prefijo de serie para los tickets emitidos (ej: T001).',
    ticketQR: 'Incluir Código QR',
    ticketQRHelp: 'Muestra un código QR de verificación SUNAT en el ticket.',

    // Botón
    saveBtn: 'Guardar Ajustes',
    savingBtn: 'Guardando...',

    // Tabs
    tabEmpresa: 'Datos de Empresa',
    tabComercial: 'Comercial & Moneda',
    tabPOS: 'POS & Caja',
    tabTicket: 'Ticket Digital',
    tabStaff: 'Personal',
  },
  en: {
    title: 'Branch Settings',
    subtitle: 'Manage business rules, POS, tickets, and staff for this branch.',
    successSave: 'Settings saved successfully!',
    errorSave: 'Failed to save settings.',
    loadingConfig: 'Loading settings...',

    // Bloque Empresa
    empresaSection: 'Company & Branch Information',
    empresaDesc: 'Configure tax ID, address, and phone details displayed on receipt headers.',
    empresaNombre: 'Business / Trade Name',
    empresaRuc: 'Tax ID / RUC Number',
    empresaDireccion: 'Tax / Fiscal Address',
    empresaTelefono: 'Contact Phone Number',
    
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
    ticketHeader: 'Additional Header Message (Optional)',
    ticketHeaderHelp: 'Secondary welcome text displayed below company details.',
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
    
    // Ticket Digital
    ticketDigitalSection: 'Digital Ticket & Receipts',
    ticketDigitalDesc: 'Enable digital ticket PDF display after each POS sale.',
    ticketDigitalToggle: 'Show Digital Ticket',
    ticketDigitalToggleDesc: 'Automatically renders a thermal-format ticket after each completed sale.',
    ticketAncho: 'Print Width',
    ticketAncho80: '80mm (Printable area: ~72mm)',
    ticketAncho58: '58mm (Printable area: ~48mm)',
    ticketSerie: 'Series Prefix',
    ticketSerieHelp: 'Series prefix for issued tickets (e.g., T001).',
    ticketQR: 'Include QR Code',
    ticketQRHelp: 'Show a SUNAT verification QR code on the ticket.',

    // Botón
    saveBtn: 'Save Settings',
    savingBtn: 'Saving...',

    // Tabs
    tabEmpresa: 'Company Details',
    tabComercial: 'Commercial & Currency',
    tabPOS: 'POS & Cash',
    tabTicket: 'Digital Ticket',
    tabStaff: 'Staff',
  }
};

type SettingsTab = 'empresa' | 'comercial' | 'pos' | 'ticket' | 'staff';

export const SettingsManager: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const { config, updateConfig, loading: settingsLoading } = useSettings();
  const { rubroConfig } = useEmpresa();
  const t = translations[lang];

  // Active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');

  // Config State
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Datos de Empresa / Sucursal
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [empresaRuc, setEmpresaRuc] = useState('');
  const [empresaDireccion, setEmpresaDireccion] = useState('');
  const [empresaTelefono, setEmpresaTelefono] = useState('');

  const [monedaSimbolo, setMonedaSimbolo] = useState('$');
  const [monedaDecimales, setMonedaDecimales] = useState(2);
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(0);
  const [comisionBaseServicio, setComisionBaseServicio] = useState(0);
  const [limiteEfectivoCaja, setLimiteEfectivoCaja] = useState(500);
  const [ticketCorrelativoInicial, setTicketCorrelativoInicial] = useState(1);
  
  // Mesas (Restaurantes)
  const [mesasCantidad, setMesasCantidad] = useState<number>(0);
  const [mesasPrefijo, setMesasPrefijo] = useState<string>('MS');

  // Métodos de pago dinámicos
  const [metodosPago, setMetodosPago] = useState<string[]>([]);
  const [metodosFavoritos, setMetodosFavoritos] = useState<string[]>([]);
  const [nuevoMetodo, setNuevoMetodo] = useState('');
  
  // Ticket fields
  const [ticketEncabezado, setTicketEncabezado] = useState('');
  const [ticketPie, setTicketPie] = useState('');

  // Ticket Digital fields
  const [ticketDigitalActivo, setTicketDigitalActivo] = useState(false);
  const [ticketAncho, setTicketAncho] = useState('80mm');
  const [ticketIncluyeQR, setTicketIncluyeQR] = useState(true);
  const [ticketSeriePrefijo, setTicketSeriePrefijo] = useState('T001');

  // Staff List & Creation State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffNombre, setStaffNombre] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRol, setStaffRol] = useState<string>(rubroConfig.rolesDisponibles[0]?.id || 'admin');
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
      setMesasCantidad(config.mesas_cantidad ?? 0);
      setMesasPrefijo(config.mesas_prefijo || 'MS');
      // Ticket Digital
      setTicketDigitalActivo(config.ticket_digital_activo ?? false);
      setTicketAncho(config.ticket_ancho || '80mm');
      setTicketIncluyeQR(config.ticket_incluir_qr ?? true);
      setTicketSeriePrefijo(config.ticket_serie_prefijo || 'T001');
    }
  }, [config]);

  // Load Sucursal Name & Details
  useEffect(() => {
    const loadSucursalDetails = async () => {
      if (!profile?.sucursal_id) return;
      try {
        const { data: sucursalData, error: sucursalError } = await supabase
          .from('sucursales')
          .select('nombre, ruc, direccion, telefono')
          .eq('id', profile.sucursal_id)
          .single();

        if (!sucursalError && sucursalData) {
          setEmpresaNombre(sucursalData.nombre || '');
          setEmpresaRuc(sucursalData.ruc || '');
          setEmpresaDireccion(sucursalData.direccion || '');
          setEmpresaTelefono(sucursalData.telefono || '');
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
        mesas_cantidad: Number(mesasCantidad),
        mesas_prefijo: mesasPrefijo.trim() || 'MS',
        // Ticket Digital
        ticket_digital_activo: ticketDigitalActivo,
        ticket_ancho: ticketAncho,
        ticket_incluir_qr: ticketIncluyeQR,
        ticket_serie_prefijo: ticketSeriePrefijo.trim() || 'T001',
      });

      if (!success) throw new Error(t.errorSave);

      // Sincronizar mesas si el rubro lo requiere
      if (rubroConfig.features.gestionMesas && profile?.sucursal_id) {
        const { error: rpcErr } = await supabase.rpc('sincronizar_mesas', {
          p_sucursal_id: profile.sucursal_id,
          p_cantidad: Number(mesasCantidad),
          p_prefijo: mesasPrefijo.trim() || 'MS',
        });
        if (rpcErr) {
          console.error('Error sincronizando mesas:', rpcErr);
        }
      }

      // Actualizar datos de la sucursal (Razón social, RUC, Dirección, Teléfono)
      await supabase
        .from('sucursales')
        .update({
          nombre: empresaNombre,
          ruc: empresaRuc,
          direccion: empresaDireccion,
          telefono: empresaTelefono,
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

  // Tab definitions
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'empresa', label: t.tabEmpresa, icon: <Building2 className="w-4 h-4" /> },
    { id: 'comercial', label: t.tabComercial, icon: <Coins className="w-4 h-4" /> },
    { id: 'pos', label: t.tabPOS, icon: <Terminal className="w-4 h-4" /> },
    { id: 'ticket', label: t.tabTicket, icon: <Receipt className="w-4 h-4" /> },
    { id: 'staff', label: t.tabStaff, icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 p-6 sm:p-8 space-y-6 bg-slate-50 max-w-6xl mx-auto overflow-y-auto">
      
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

      {/* ─── Tab Navigation ────────────────────────── */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab Content ────────────────────────── */}
      <form onSubmit={handleSaveSettings} className="space-y-8">

        {/* ═══ TAB: Datos de Empresa ═══ */}
        {activeTab === 'empresa' && (
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.empresaSection}</h3>
                  <p className="text-[11px] text-slate-400">{t.empresaDesc}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Razón Social / Nombre Comercial */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.empresaNombre}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mi Empresa S.A.C."
                    value={empresaNombre}
                    onChange={(e) => setEmpresaNombre(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-medium"
                  />
                </div>

                {/* RUC / Identificación Fiscal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.empresaRuc}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="20601234567"
                    maxLength={11}
                    value={empresaRuc}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setEmpresaRuc(onlyNums);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold"
                  />
                  {empresaRuc.length > 0 && empresaRuc.length < 11 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠️ El RUC debe contener exactamente 11 dígitos ({empresaRuc.length}/11)
                    </p>
                  )}
                  {empresaRuc.length === 11 && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">
                      ✓ RUC de 11 dígitos validado
                    </p>
                  )}
                </div>

                {/* Teléfono de Contacto */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.empresaTelefono}
                  </label>
                  <input
                    type="text"
                    placeholder="(01) 456-7890 / +51 987654321"
                    value={empresaTelefono}
                    onChange={(e) => setEmpresaTelefono(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-medium"
                  />
                </div>

                {/* Dirección Fiscal / Comercial */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {t.empresaDireccion}
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Principal 123, Miraflores - Lima"
                    value={empresaDireccion}
                    onChange={(e) => setEmpresaDireccion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              {/* Card Explicativa de integración con Ticket */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-900">
                    {lang === 'es' ? 'Visualización Automática en Comprobantes' : 'Automatic Display on Receipts'}
                  </p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    {lang === 'es'
                      ? 'Esta información (Razón Social, RUC, Dirección y Teléfono) se posicionará automáticamente en la cabecera superior de todos los tickets impresos y digitales emitidos en el POS.'
                      : 'This information (Trade Name, Tax ID, Address, Phone) automatically appears at the top header of all printed and digital sales receipts.'}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══ TAB: Comercial & Moneda ═══ */}
        {activeTab === 'comercial' && (
          <div className="space-y-8">
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
          </div>
        )}

        {/* ═══ TAB: POS & Caja ═══ */}
        {activeTab === 'pos' && (
          <div className="space-y-8">
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

            {/* Bloque: Configuración de Mesas (Solo Restaurantes) */}
            {rubroConfig.features.gestionMesas && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                    <Utensils className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">Configuración de Mesas y Salón</h3>
                    <p className="text-[11px] text-slate-400">Define el total de mesas físicas y la nomenclatura para tu restaurante.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Cantidad de mesas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Cantidad de Mesas
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      required
                      value={mesasCantidad}
                      onChange={(e) => setMesasCantidad(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Cantidad total de mesas activas en el salón (ej. 12).
                    </p>
                  </div>

                  {/* Prefijo de mesas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Prefijo de Nomenclatura
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      placeholder="MS"
                      value={mesasPrefijo}
                      onChange={(e) => setMesasPrefijo(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Prefijo impreso en el POS (ej: MS genera MS-01, MS-02...).
                    </p>
                  </div>
                </div>

                {mesasCantidad > 0 && (
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-xs flex items-center justify-between text-slate-600 font-medium">
                    <span>Vista previa de tarjetas en POS:</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                      {mesasPrefijo || 'MS'}-01 ... {mesasPrefijo || 'MS'}-{mesasCantidad.toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: Ticket Digital & Comprobantes ═══ */}
        {activeTab === 'ticket' && (
          <div className="space-y-8">
            {/* Sección Principal: Activar/Desactivar Ticket Digital */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">{t.ticketDigitalSection}</h3>
                  <p className="text-[11px] text-slate-400">{t.ticketDigitalDesc}</p>
                </div>
              </div>

              {/* Toggle Principal */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ticketDigitalActivo ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'} transition-colors`}>
                    {ticketDigitalActivo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.ticketDigitalToggle}</p>
                    <p className="text-[10px] text-slate-400">{t.ticketDigitalToggleDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTicketDigitalActivo(!ticketDigitalActivo)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    ticketDigitalActivo ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                    ticketDigitalActivo ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Opciones del Ticket Digital (solo visibles cuando está activo) */}
              {ticketDigitalActivo && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Ancho de Impresión */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {t.ticketAncho}
                      </label>
                      <select
                        value={ticketAncho}
                        onChange={(e) => setTicketAncho(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm bg-white"
                      >
                        <option value="80mm">{t.ticketAncho80}</option>
                        <option value="58mm">{t.ticketAncho58}</option>
                      </select>
                      <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg mt-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <Printer className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>
                            {ticketAncho === '80mm' 
                              ? (lang === 'es' ? 'POS-80: Rollo estándar. Área útil de impresión: ~72mm.' : 'POS-80: Standard roll. Printable area: ~72mm.')
                              : (lang === 'es' ? 'POS-58: Rollo compacto. Área útil de impresión: ~48mm.' : 'POS-58: Compact roll. Printable area: ~48mm.')
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Prefijo de Serie */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {t.ticketSerie}
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        required
                        placeholder="T001"
                        value={ticketSeriePrefijo}
                        onChange={(e) => setTicketSeriePrefijo(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">{t.ticketSerieHelp}</p>
                      {/* Preview */}
                      <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg mt-2 text-center">
                        <span className="text-[10px] text-slate-500 font-medium">{lang === 'es' ? 'Vista previa:' : 'Preview:'} </span>
                        <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {ticketSeriePrefijo || 'T001'}-{(ticketCorrelativoInicial || 1).toString().padStart(8, '0')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle QR */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${ticketIncluyeQR ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'} transition-colors`}>
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{t.ticketQR}</p>
                        <p className="text-[10px] text-slate-400">{t.ticketQRHelp}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTicketIncluyeQR(!ticketIncluyeQR)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        ticketIncluyeQR ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        ticketIncluyeQR ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Clarificación de Encabezado de Ticket + Datos de Empresa */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg flex-shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-900">
                        {lang === 'es' ? '🏢 Datos de Empresa en el Encabezado' : '🏢 Company Details in Ticket Header'}
                      </p>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        {lang === 'es'
                          ? <>Los datos principales de la cabecera (<strong>{empresaNombre || 'Razón Social'}</strong>, <strong>RUC: {empresaRuc || '—'}</strong>, <strong>{empresaDireccion || 'Dirección'}</strong>, <strong>Tel: {empresaTelefono || '—'}</strong>) se obtienen de la pestaña <button type="button" onClick={() => setActiveTab('empresa')} className="underline font-bold hover:text-emerald-950 cursor-pointer">'Datos de Empresa'</button>. A continuación puedes escribir un mensaje adicional o promocional que aparecerá justo debajo.</>
                          : <>Primary header details are managed under the <button type="button" onClick={() => setActiveTab('empresa')} className="underline font-bold hover:text-emerald-950 cursor-pointer">'Company Details'</button> tab. Below you can write an additional welcome or promotional note.</>}
                      </p>
                    </div>
                  </div>

                  {/* Encabezado y Pie de Ticket */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {t.ticketHeader}
                      </label>
                      <textarea
                        rows={2}
                        value={ticketEncabezado}
                        onChange={(e) => setTicketEncabezado(e.target.value)}
                        placeholder={lang === 'es' ? 'Ej. ¡Bienvenidos a nuestra sucursal central! Promoción del mes...' : 'E.g. Welcome to our central branch! Special offer...'}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-sans"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">{t.ticketHeaderHelp}</p>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {t.ticketFooter}
                      </label>
                      <textarea
                        rows={2}
                        value={ticketPie}
                        onChange={(e) => setTicketPie(e.target.value)}
                        placeholder={lang === 'es' ? 'Gracias por su preferencia. Conserve este comprobante.' : 'Thank you for your visit. Please keep this receipt.'}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Banner SUNAT */}
            <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-800">
                  {lang === 'es' ? 'Preparado para Facturación Electrónica SUNAT' : 'Ready for SUNAT Electronic Invoicing'}
                </p>
                <p className="text-[10px] text-blue-600 leading-relaxed">
                  {lang === 'es' 
                    ? 'La estructura del ticket digital incluye campos de base imponible, IGV, monto en letras y código QR siguiendo la representación impresa de comprobantes de pago electrónico de SUNAT. Estos campos se activarán automáticamente cuando la facturación electrónica sea habilitada en una fase futura.'
                    : 'The digital ticket structure includes taxable base, VAT, amount in words, and QR code fields following SUNAT electronic payment receipt printed representation. These fields will activate automatically when electronic invoicing is enabled in a future phase.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: Personal ═══ */}
        {activeTab === 'staff' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Creación de Empleados */}
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

              <div className="space-y-4">
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
                    onChange={(e) => setStaffRol(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm bg-white"
                  >
                    {rubroConfig.rolesDisponibles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comisión Individual (Solo si el rubro lo permite y es rol barbero/mesero) */}
                {rubroConfig.features.comisionesBarbero && (staffRol === 'barbero' || staffRol === 'mesero') && (
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
                  type="button"
                  disabled={staffLoading || !staffNombre.trim() || !staffEmail.trim() || !staffPassword.trim()}
                  onClick={handleCreateStaff}
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
              </div>
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
                {staffList.map((emp) => {
                  const roleConfig = rubroConfig.rolesDisponibles.find(r => r.id === emp.rol);
                  const roleLabel = roleConfig ? roleConfig.label : (emp.rol === 'admin' ? t.admin : emp.rol === 'cajero' ? t.cajero : t.barbero);
                  const badgeStyle = roleConfig ? roleConfig.badgeStyle : 'bg-blue-50 text-blue-700 border-blue-100';
                  return (
                    <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{emp.nombre}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{emp.email || '—'}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[9px] font-extrabold border uppercase tracking-wider ${badgeStyle}`}>
                          {roleLabel}
                        </span>
                      </div>

                      {rubroConfig.features.comisionesBarbero && (emp.rol === 'barbero' || emp.rol === 'mesero') && (
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
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Botón Guardar Cambios (siempre visible) ─── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all text-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
    </div>
  );
};
