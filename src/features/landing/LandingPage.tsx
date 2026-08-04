import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  Wallet, 
  TrendingUp, 
  Users, 
  Building2, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Lock,
  Clock,
  Layers
} from 'lucide-react';
import { SEO } from '../../components/SEO';

export const LandingPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Aura ERP',
    'operatingSystem': 'Web, Cloud',
    'applicationCategory': 'BusinessApplication',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
    },
    'description': 'Sistema ERP y Punto de Venta (POS) en la nube para controlar ventas, inventario, arqueos de caja y personal en tiempo real.',
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.9',
      'ratingCount': '128'
    }
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': '¿Qué es Aura ERP y cómo ayuda a mi negocio?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Aura ERP es una plataforma de gestión empresarial en la nube que unifica el Punto de Venta (POS), control de inventarios, gestión de turnos de caja, reportes financieros y administración de personal en una sola interfaz fácil de usar.'
        }
      },
      {
        '@type': 'Question',
        'name': '¿Necesito instalar software adicional?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'No, Aura ERP funciona 100% en la nube a través de cualquier navegador web moderno (laptop, tablet o PC).'
        }
      },
      {
        '@type': 'Question',
        'name': '¿Aura ERP soporta múltiples sucursales o empresas?',
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': 'Sí, Aura ERP está diseñado con arquitectura multi-empresa y multi-sucursal, permitiéndote administrar diferentes negocios desde una misma cuenta.'
        }
      }
    ]
  };

  const combinedSchema = [softwareSchema, faqSchema];

  const features = [
    {
      icon: ShoppingCart,
      title: 'Punto de Venta (POS) Ultra Rápido',
      description: 'Facturación ágil con soporte para escáner de código de barras, cobro multimedio (Efectivo, Tarjeta, Transferencia) y ticket térmico.'
    },
    {
      icon: Package,
      title: 'Control de Inventarios en Tiempo Real',
      description: 'Gestión de catálogo, variantes, categorías, alertas de stock mínimo y trazabilidad de compras a proveedores.'
    },
    {
      icon: Wallet,
      title: 'Gestión de Cajas y Arqueos',
      description: 'Aperturas, cierres de turno, reasignación de ventas, aprobación de cuadres y control de diferencias de efectivo.'
    },
    {
      icon: TrendingUp,
      title: 'Reportes Financieros Inteligentes',
      description: 'Dashboards analíticos de ingresos, utilidades, productos más vendidos, rendimiento por colaborador y métricas clave.'
    },
    {
      icon: Users,
      title: 'Clientes y Personal',
      description: 'Administración de clientes frecuentes, comisiones de barberos/vendedores y roles con permisos granulados.'
    },
    {
      icon: Building2,
      title: 'Arquitectura Multi-Empresa',
      description: 'Administra múltiples razones sociales o sucursales con un solo usuario y aislamiento seguro de datos.'
    }
  ];

  const faqs = [
    {
      question: '¿Qué es Aura ERP y cómo ayuda a mi negocio?',
      answer: 'Aura ERP es una plataforma de gestión empresarial en la nube que unifica el Punto de Venta (POS), control de inventarios, gestión de turnos de caja, reportes financieros y administración de personal en una sola interfaz limpia y ultra rápida.'
    },
    {
      question: '¿Puedo usar el sistema desde tablets o computadoras normales?',
      answer: 'Sí, Aura ERP es una aplicación web responsiva optimizada para funcionar fluidamente en computadoras de escritorio, laptops y tablets con conexión a internet.'
    },
    {
      question: '¿Cómo funciona la gestión de turnos y cajas?',
      answer: 'Los cajeros o administradores inician turno con un monto inicial. El sistema registra cada movimiento y venta en tiempo real. Al finalizar la jornada, se efectúa un cierre de turno con arqueo para auditoría y aprobación.'
    },
    {
      question: '¿Puedo personalizar los roles y permisos de mis colaboradores?',
      answer: 'Totalmente. Puedes asignar roles específicos como Administrador, Cajero o Personal Operativo, restringiendo el acceso únicamente a los módulos autorizados.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      <SEO 
        title="Aura ERP - Sistema de Gestión Empresarial y POS en la Nube"
        description="Aura ERP es el sistema de punto de venta (POS), control de inventario, cajas y personal para negocios modernos y en crecimiento. Pruébalo ahora."
        keywords="Aura ERP, POS, punto de venta cloud, inventarios, control de caja, software erp pymes, facturacion"
        jsonLd={combinedSchema}
      />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Aura <span className="text-blue-600">ERP</span></span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">POS Cloud</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">Características</a>
            <a href="#beneficios" className="hover:text-blue-600 transition-colors">Beneficios</a>
            <a href="#planes" className="hover:text-blue-600 transition-colors">Planes</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">Preguntas Frecuentes</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link 
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:shadow-md hover:shadow-blue-600/20"
            >
              <span>Acceder al ERP</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>Plataforma ERP & Punto de Venta de Nueva Generación</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
              Toma el Control Total de tu Negocio con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">Aura ERP</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Gestión de ventas en Punto de Venta (POS), control de inventarios, cierres de caja inteligentes y análisis financiero en tiempo real.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5"
              >
                <span>Probar Sistema Ahora</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#caracteristicas"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm transition-all"
              >
                <span>Explorar Funciones</span>
              </a>
            </div>

            {/* Badges / Security indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Seguridad Supabase RLS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Sincronización Cloud 24/7</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Multi-Empresa & Sucursales</span>
              </div>
            </div>

            {/* Dashboard Mockup Showcase */}
            <div className="mt-14 max-w-5xl mx-auto">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="ml-2 text-xs font-mono text-slate-400">admin.aura-erp.com/dashboard</span>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">Sistema Activo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Ventas del Día</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 mt-2">$ 4,850.00</p>
                    <span className="text-xs text-emerald-600 font-semibold">+18% vs ayer</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Turno de Caja</span>
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 mt-2">Caja #1 - Abierta</p>
                    <span className="text-xs text-blue-600 font-semibold">142 transacciones</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Stock Crítico</span>
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 mt-2">3 Productos</p>
                    <span className="text-xs text-amber-600 font-semibold">Requiere reabastecimiento</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="caracteristicas" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-xs font-extrabold tracking-wider text-blue-600 uppercase">Todo en uno</h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Módulos Diseñados para Potenciar tu Negocio
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Herramientas poderosas diseñadas de forma modular para adaptarse a la operativa diaria de tu empresa.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, idx) => {
                const IconComponent = feature.icon;
                return (
                  <article 
                    key={idx} 
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Benefits Breakdown */}
        <section id="beneficios" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-extrabold tracking-wider text-blue-600 uppercase">Eficiencia Operativa</span>
                <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Evita Descuadres de Caja y Pérdida de Inventario
                </h2>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  Con el sistema de trazabilidad de Aura ERP, cada centavo cobrado y cada unidad vendida queda vinculada al turno activo del colaborador.
                </p>

                <ul className="mt-8 space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold block">Cierres de Turno Auditables:</strong>
                      <span className="text-slate-600 text-sm">Control estricto con reporte de sobrantes/faltantes y flujo de aprobación por administrador.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold block">Reasignación de Ventas Retroactivas:</strong>
                      <span className="text-slate-600 text-sm">Vincula ventas sueltas a turnos correspondientes sin romper la contabilidad.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 font-semibold block">Gestión de Comisiones:</strong>
                      <span className="text-slate-600 text-sm">Calcula comisiones por vendedor o barbero automáticamente al cerrar cada venta.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Margen Promedio de Ganancia</p>
                      <p className="text-lg font-bold text-slate-900">+34% Eficiencia Financiera</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Acceso Seguro con Roles</p>
                      <p className="text-lg font-bold text-slate-900">Control Granular por Usuario</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Velocidad de Cobro</p>
                      <p className="text-lg font-bold text-slate-900">&lt; 5 Segundos por Ticket</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="planes" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-xs font-extrabold tracking-wider text-blue-600 uppercase">Planes Flexibles</h2>
              <p className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Elige la Solución Ideal para tu Empresa
              </p>
              <p className="mt-4 text-slate-600">
                Sin contratos forzosos. Escala según el crecimiento de tu negocio.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8">
              {/* Plan Pyme */}
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">Plan Pyme</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-4">Comercio & POS</h3>
                  <p className="text-slate-500 text-sm mt-2">Ideal para negocios individuales y pequeñas tiendas.</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">$ 29</span>
                    <span className="text-slate-500 text-sm font-medium">/ mes</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>1 Sucursal / Punto de Venta</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Control Ilimitado de Productos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Gestión de Cajas y Cierres de Turno</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Reportes de Ventas Básicos</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/login"
                  className="mt-8 w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-center transition-colors block text-sm"
                >
                  Comenzar Ahora
                </Link>
              </div>

              {/* Plan Enterprise */}
              <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 shadow-md relative flex flex-col justify-between">
                <div className="absolute -top-3.5 right-6 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
                  Más Popular
                </div>

                <div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">Plan PRO Multi-Empresa</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-4">Enterprise ERP</h3>
                  <p className="text-slate-500 text-sm mt-2">Para cadenas de negocios, barberías y múltiples sucursales.</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">$ 69</span>
                    <span className="text-slate-500 text-sm font-medium">/ mes</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Multi-Sucursal & Multi-Empresa</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>POS + Módulo de Compras & Proveedores</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Comisiones de Personal y Barberos</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Reportes Avanzados & Exportación Excel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Soporte Prioritario 24/7</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/login"
                  className="mt-8 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center transition-all shadow-md shadow-blue-600/20 block text-sm"
                >
                  Acceder a Prueba Demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section id="faq" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Resolvemos tus dudas</span>
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900">Preguntas Frecuentes</h2>
              <p className="mt-2 text-slate-600 text-sm">Todo lo que necesitas saber antes de implementar Aura ERP.</p>
            </div>

            <div className="mt-10 space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div 
                    key={index}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between font-semibold text-slate-900 hover:text-blue-600 transition-colors focus:outline-none"
                    >
                      <span className="text-base">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed bg-white border-t border-slate-100">
                        <p className="pt-3">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-16 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              ¿Listo para simplificar la administración de tu negocio?
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-2xl mx-auto">
              Accede ahora mismo a Aura ERP y comprueba por qué es la plataforma elegida para potenciar ventas y caja.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-extrabold rounded-xl shadow-lg hover:bg-blue-50 transition-all hover:scale-105"
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Aura ERP</span>
          </div>

          <p className="text-xs text-slate-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} Aura ERP / Sellora. Todos los derechos reservados. Sistema de Gestión y Punto de Venta en la Nube.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link to="/login" className="hover:text-white transition-colors">Ingreso Administrador</Link>
            <a href="#faq" className="hover:text-white transition-colors">Soporte</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
