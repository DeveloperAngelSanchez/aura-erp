import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Shield,
  Lock,
  Scale,
  Globe,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Server,
  Layers,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  Search,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { SEO } from '../../components/SEO';

interface Section {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export const TermsOfService: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const lastUpdated = '18 de Agosto de 2026';
  const effectiveDate = '18 de Agosto de 2026';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections: Section[] = [
    {
      id: 'intro',
      title: '1. Introducción y Aceptación de los Términos',
      shortTitle: 'Introducción & Aceptación',
      icon: FileText,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Bienvenido a <strong>Aura ERP</strong> (en adelante, &ldquo;la Plataforma&rdquo;, &ldquo;el Software&rdquo; o &ldquo;el Servicio&rdquo;). Los presentes Términos de Servicio (&ldquo;Términos&rdquo; o &ldquo;Contrato&rdquo;) constituyen un acuerdo legal vinculante celebrado entre usted, en calidad de representante de una entidad comercial, persona jurídica o persona natural con negocio (&ldquo;el Cliente&rdquo;, &ldquo;el Usuario&rdquo; o &ldquo;Usted&rdquo;), y <strong>Aura ERP</strong> (&ldquo;la Empresa&rdquo;, &ldquo;Nosotros&rdquo; o &ldquo;el Proveedor&rdquo;).
          </p>
          <p>
            Al crear una cuenta, acceder, navegar o utilizar cualquier funcionalidad de Aura ERP (incluidos el Punto de Venta [POS], Control de Inventarios, Gestión de Cajas, Módulo de Personal, Módulos CRM con integraciones de terceros y APIs), Usted declara haber leído, comprendido y aceptado en su totalidad estos Términos y nuestras políticas de seguridad vinculadas.
          </p>
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Naturaleza B2B Exclusiva:</strong> Aura ERP es una plataforma orientada exclusivamente a actividades comerciales, empresariales y profesionales (Business-to-Business o B2B). El uso del sistema por parte de consumidores finales no comerciales no está previsto en el alcance del servicio.
            </div>
          </div>
          <p>
            Si Usted no está de acuerdo con cualquiera de las cláusulas aquí estipuladas, deberá abstenerse de inmediato de utilizar o registrarse en la Plataforma.
          </p>
        </div>
      )
    },
    {
      id: 'provider',
      title: '2. Identificación del Proveedor y Marco Operativo',
      shortTitle: 'Identificación del Proveedor',
      icon: Building2,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP es una plataforma tecnológica desarrollada y operada como solución SaaS (Software as a Service) para la administración comercial y operativa de micro, pequeñas y medianas empresas en América Latina e internacionalmente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Denominación del Servicio</span>
              <p className="text-sm font-bold text-slate-900 mt-1">Aura ERP</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Canal Oficial de Atención</span>
              <p className="text-sm font-bold text-blue-600 mt-1">Portal y Mesa de Ayuda en Plataforma</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Modalidad de Servicio</span>
              <p className="text-sm font-bold text-slate-900 mt-1">SaaS Cloud Multi-Empresa</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jurisdicción de Referencia</span>
              <p className="text-sm font-bold text-slate-900 mt-1">República del Perú / Estándares Internacionales SaaS</p>
            </div>
          </div>
          <p>
            Las comunicaciones oficiales referentes a estos términos, notificaciones operativas y solicitudes de soporte se gestionan de manera segura a través del portal de administración de la plataforma para usuarios autenticados.
          </p>
        </div>
      )
    },
    {
      id: 'services',
      title: '3. Descripción de los Servicios y Alcance Funcional',
      shortTitle: 'Descripción del Servicio',
      icon: Layers,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP pone a disposición del Cliente un ecosistema integral de gestión empresarial en la nube, compuesto por los siguientes módulos y funcionalidades:
          </p>
          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Punto de Venta (POS):</strong>
              <p className="text-xs text-slate-600 mt-1">
                Facturación ágil, registro de ventas multimedio (efectivo, tarjetas, transferencias bancarias), generación de tickets de venta internos digitales y físicos, y escaneo de códigos de barra.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Control de Cajas, Turnos y Arqueos:</strong>
              <p className="text-xs text-slate-600 mt-1">
                Apertura y cierre de turnos con saldo inicial, registro de movimientos de caja menor (ingresos/egresos), auditoría de descuadres, historial de turnos y flujo de aprobación por administrador.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Gestión de Catálogo e Inventarios:</strong>
              <p className="text-xs text-slate-600 mt-1">
                Administración de productos, variantes, categorías, control de existencias en almacenes, alertas de stock mínimo y registro de compras a proveedores.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">CRM y Gestión de Conversaciones (Integración con TikTok):</strong>
              <p className="text-xs text-slate-600 mt-1">
                Sincronización de mensajería comercial, gestión de prospectos y contactos, respuestas rápidas predefinidas, etiquetas de estado y vinculación de chats directos con el catálogo de clientes.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Personal, Asistencia y Comisiones:</strong>
              <p className="text-xs text-slate-600 mt-1">
                Control de roles y permisos granulares (Administrador, Cajero, Barbero, Personal Operativo), cálculo automatizado de comisiones por venta/servicio y registro de asistencia.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Arquitectura Multi-Empresa & Multi-Sucursal:</strong>
              <p className="text-xs text-slate-600 mt-1">
                Aislamiento estricto de bases de datos y registros entre distintas empresas y sucursales mediante políticas de seguridad a nivel de fila (Row Level Security).
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Aura ERP se reserva el derecho de actualizar, optimizar, añadir o discontinuar funcionalidades con el fin de mejorar la seguridad, estabilidad y rendimiento del sistema.
          </p>
        </div>
      )
    },
    {
      id: 'accounts',
      title: '4. Cuentas, Credenciales y Responsabilidad de Acceso',
      shortTitle: 'Cuentas & Seguridad',
      icon: Lock,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Para hacer uso de Aura ERP, el Cliente debe contar con una cuenta de usuario principal (&ldquo;Cuenta Administrador&rdquo;) vinculada a un correo electrónico corporativo válido y credenciales de acceso seguras.
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs text-slate-600">
            <li><strong>Veracidad de los Datos:</strong> El Cliente garantiza que toda la información ingresada durante el registro y configuración de la empresa es precisa, completa y actualizada.</li>
            <li><strong>Custodia de Credenciales:</strong> El Cliente es el único responsable de preservar la estricta confidencialidad de sus contraseñas, tokens de autenticación y claves de API. Toda actividad efectuada desde su cuenta se presumirá realizada por el Cliente.</li>
            <li><strong>Gestión de Usuarios Secundarios:</strong> El Administrador de la cuenta es plenamente responsable por los accesos, permisos y operaciones que asigna a sus colaboradores y personal operativo.</li>
            <li><strong>Notificación de Incidencias:</strong> El Cliente se compromete a reportar de inmediato a través de los canales de seguridad en la plataforma cualquier sospecha de acceso no autorizado o vulneración de sus credenciales.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'thirdparty',
      title: '5. Integración con Terceros y Cumplimiento de Políticas de TikTok',
      shortTitle: 'Terceros & TikTok API',
      icon: MessageSquare,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP incorpora integraciones con plataformas y servicios de terceros, incluyendo pero no limitándose a <strong>TikTok Inc. / ByteDance Ltd. (TikTok for Business / TikTok Direct Messages API)</strong> y servicios de infraestructura cloud como <strong>Supabase Inc.</strong>
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Directrices Específicas para el Módulo TikTok CRM
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <strong>Protocolo OAuth 2.0:</strong> La vinculación de cuentas de TikTok se realiza exclusivamente mediante flujos autorizados OAuth 2.0. Aura ERP no almacena ni tiene acceso a las contraseñas de las cuentas de TikTok del Cliente.
              </li>
              <li>
                <strong>Alcance y Uso de Datos de Mensajería:</strong> Los tokens de acceso se emplean únicamente para sincronizar y responder conversaciones dentro del CRM de la empresa autorizada.
              </li>
              <li>
                <strong>Cumplimiento de Políticas de Desarrollador de TikTok:</strong> El Cliente se obliga a cumplir cabalmente con los <em>TikTok Commercial Terms of Service</em> y <em>Developer Platform Policies</em>. Queda estrictamente prohibido el envío de spam, mensajes masivos automatizados no solicitados, contenido engañoso o violaciones de propiedad intelectual mediante el canal de chat.
              </li>
              <li>
                <strong>Consentimiento del Destinatario:</strong> El Cliente garantiza que cuenta con la base legal y el consentimiento de sus usuarios finales para remitirles comunicaciones comerciales a través de TikTok.
              </li>
              <li>
                <strong>Desconexión y Revocación:</strong> El Cliente puede desvincular su cuenta de TikTok en cualquier momento desde el panel de ajustes de Aura ERP o revocando el acceso directamente en su panel de desarrollador de TikTok.
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            Aura ERP no es responsable por interrupciones, limitaciones de cuota (rate limits), cambios en las APIs o sanciones impuestas unilateralmente por plataformas de terceros sobre las cuentas del Cliente.
          </p>
        </div>
      )
    },
    {
      id: 'privacy',
      title: '6. Privacidad, Protección de Datos y Tratamiento de Información',
      shortTitle: 'Protección de Datos & RGPD',
      icon: Shield,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP aplica rigurosos estándares de seguridad y privacidad en estricto cumplimiento de la <strong>Ley N° 29733 (Ley de Protección de Datos Personales de la República del Perú)</strong> y su Reglamento (D.S. 003-2013-JUS), así como las directrices internacionales del <strong>Reglamento General de Protección de Datos de la Unión Europea (RGPD / GDPR)</strong> y la <strong>California Consumer Privacy Act (CCPA)</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">Aura ERP como Responsable</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tratamos los datos de registro y contacto del Cliente para la ejecución del contrato y la provisión del servicio SaaS.
              </p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block mb-1">Aura ERP como Encargado (Processor)</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Respecto a los datos de clientes finales, ventas y empleados que el Cliente almacena en el sistema, Aura ERP actúa como Encargado del Tratamiento. El Cliente retiene la condición de Responsable del Tratamiento.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <strong className="text-slate-900 font-semibold block text-xs uppercase tracking-wider">Principios Clave del Tratamiento:</strong>
            <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
              <li><strong>Propiedad de la Información:</strong> Todos los datos de negocio (catálogos, precios, compras, arqueos, ventas, listado de clientes) son de propiedad exclusiva y confidencial del Cliente. Aura ERP no comercializa, no cede ni comparte estos datos con terceros anunciantes.</li>
              <li><strong>Seguridad y Aislamiento:</strong> La información reside en bases de datos con encriptación en reposo y en tránsito (TLS/HTTPS), protegidas por políticas de Row Level Security (RLS) que aíslan estrictamente los datos entre diferentes empresas.</li>
              <li><strong>Ejercicio de Derechos ARCO:</strong> El titular de los datos puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición remitiendo su solicitud a través de la mesa de ayuda de la plataforma.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'intellectual',
      title: '7. Propiedad Intelectual y Licencia de Uso',
      shortTitle: 'Propiedad Intelectual',
      icon: Sparkles,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            La plataforma Aura ERP, incluyendo su código fuente, arquitectura de software, bases de datos, diseños gráficos, interfaces de usuario, logotipos, marcas comerciales y documentación asociada, son propiedad exclusiva de Aura ERP y sus licenciantes, encontrándose protegidos por las leyes de derechos de autor y propiedad industrial nacionales e internacionales.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <strong className="text-xs font-bold text-slate-900 uppercase tracking-wider">Concesión de Licencia:</strong>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aura ERP concede al Cliente una licencia de uso limitada, no exclusiva, intransferible, no sublicenciable y revocable para acceder y operar la plataforma vía web conforme a su plan de suscripción contratado.
            </p>
          </div>
          <p className="text-xs text-slate-600">
            Queda estrictamente prohibido realizar ingeniería inversa, descompilar, duplicar, comercializar por cuenta propia, crear obras derivadas o realizar extracción masiva automatizada (scraping) sobre cualquier componente de la Plataforma.
          </p>
        </div>
      )
    },
    {
      id: 'pricing',
      title: '8. Planes de Suscripción, Tarifas y Pagos',
      shortTitle: 'Planes & Facturación',
      icon: Clock,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            El acceso a las funcionalidades de Aura ERP se estructura a través de planes de suscripción periódicos (mensuales o anuales) y períodos de prueba o demostración según se detalle en el portal web:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-900 block">Plan Pyme (Comercio & POS)</span>
              <p className="text-xs text-slate-500 mt-1">1 Sucursal, productos ilimitados, gestión de cajas y reportes básicos.</p>
              <p className="text-sm font-extrabold text-blue-600 mt-2">$29 USD / mes</p>
            </div>
            <div className="p-4 bg-white border border-blue-200 rounded-xl bg-blue-50/20">
              <span className="text-xs font-bold text-slate-900 block">Plan Enterprise (Multi-Empresa PRO)</span>
              <p className="text-xs text-slate-500 mt-1">Multi-sucursal, módulo de compras, comisiones de personal, CRM y soporte prioritario.</p>
              <p className="text-sm font-extrabold text-blue-600 mt-2">$69 USD / mes</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li><strong>Período de Demostración:</strong> Aura ERP puede ofrecer acceso de prueba gratuito por tiempo limitado sin obligación de contratación permanente.</li>
            <li><strong>Renovación y Cancelación:</strong> Las suscripciones se renuevan periódicamente salvo que el Cliente solicite la cancelación con anterioridad al cierre del ciclo.</li>
            <li><strong>Modificación de Tarifas:</strong> Las tarifas podrán ser actualizadas previa notificación con al menos treinta (30) días calendario de anticipación vía aviso en plataforma.</li>
            <li><strong>Política de Reembolsos:</strong> Salvo que la legislación aplicable disponga lo contrario, los pagos realizados por períodos de servicio transcurridos no son reembolsables.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sla',
      title: '9. Disponibilidad del Servicio, Mantenimiento y SLAs',
      shortTitle: 'Disponibilidad & Soporte',
      icon: Server,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP opera sobre infraestructura en la nube de alta disponibilidad y procura mantener un estándar de operatividad (Uptime) del <strong>99.9%</strong> anual.
          </p>
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Exclusiones de Disponibilidad:</strong> El cálculo de disponibilidad excluye ventanas de mantenimiento programadas (notificadas previamente), fallas imputables a la conexión de internet o hardware del Cliente (impresoras térmicas, tablets, navegadores desactualizados), y eventos de fuerza mayor o caso fortuito.
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Aura ERP realiza copias de seguridad (backups) periódicas automáticas de las bases de datos para garantizar la resiliencia operativa ante contingencias.
          </p>
        </div>
      )
    },
    {
      id: 'prohibitions',
      title: '10. Uso Aceptable y Conductas Prohibidas',
      shortTitle: 'Uso Aceptable & Restricciones',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            El Cliente se compromete a hacer uso de Aura ERP de forma lícita, ética y de conformidad con el orden público y las buenas costumbres.
          </p>
          <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
            <strong className="text-xs font-bold text-rose-900 uppercase tracking-wider block">Conductas Estrictamente Prohibidas:</strong>
            <ul className="space-y-1.5 text-xs text-rose-800 list-disc list-inside">
              <li>Utilizar el sistema para la comercialización de bienes o servicios ilegales, ilícitos, falsificados o no autorizados.</li>
              <li>Intentar descifrar, eludir o vulnerar los mecanismos de autenticación, Row Level Security o firewalls de la base de datos.</li>
              <li>Cargar o transmitir virus, troyanos, scripts maliciosos o cualquier código con fines destructivos.</li>
              <li>Utilizar el módulo de CRM para remitir mensajes difamatorios, abusivos, contenido sexual explícito no solicitado o comunicaciones que infrinjan derechos de terceros.</li>
              <li>Realizar pruebas de carga o escaneos de vulnerabilidades no autorizados expresamente y por escrito por Aura ERP.</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            La comisión de cualquiera de estas conductas facultará a Aura ERP a suspender o dar de baja inmediata la cuenta infractora sin derecho a reclamo o compensación.
          </p>
        </div>
      )
    },
    {
      id: 'liability',
      title: '11. Limitación de Responsabilidad e Indemnidad',
      shortTitle: 'Responsabilidad & Indemnidad',
      icon: Scale,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            En la máxima medida permitida por el ordenamiento legal aplicable:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li>
              <strong>Exclusión de Daños Indirectos:</strong> Aura ERP no será responsable frente al Cliente ni frente a terceros por daños indirectos, incidentales, punitivos, lucro cesante, pérdida de ingresos comerciales, pérdida de datos o interrupción de negocios derivada del uso o la imposibilidad de uso del software.
            </li>
            <li>
              <strong>Obligaciones Tributarias y Fiscales:</strong> El Cliente es el único y exclusivo responsable del cumplimiento de sus obligaciones tributarias, declaración de ingresos y emisión formal de comprobantes fiscales ante la administración tributaria de su país (SUNAT, SAT, etc.). Aura ERP provee un registro administrativo y tickets de control interno.
            </li>
            <li>
              <strong>Tope de Responsabilidad:</strong> La responsabilidad agregada total de Aura ERP ante cualquier reclamación derivada de estos términos estará limitada al monto efectivamente abonado por el Cliente a Aura ERP durante los tres (3) meses inmediatamente anteriores al evento generador del reclamo.
            </li>
            <li>
              <strong>Indemnidad:</strong> El Cliente se compromete a defender, indemnizar y mantener indemne a Aura ERP, sus directores, colaboradores y contratistas frente a cualquier demanda, reclamo, multa o gasto legal derivado del incumplimiento de estos términos o de la legislación aplicable por parte del Cliente.
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'termination',
      title: '12. Suspensión, Terminación y Portabilidad de Datos',
      shortTitle: 'Terminación & Exportación',
      icon: Users,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            El presente contrato mantendrá su vigencia mientras el Cliente mantenga activa su cuenta o suscripción a Aura ERP.
          </p>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li><strong>Cancelación Voluntaria:</strong> El Cliente puede dar de baja su cuenta en cualquier momento mediante solicitud formal a través del panel de administración del sistema.</li>
            <li><strong>Suspensión por Causa Justificada:</strong> Aura ERP podrá suspender temporal o definitivamente el servicio en caso de falta de pago prolongada, infracción grave de estos Términos o requerimiento de autoridad competente.</li>
            <li><strong>Portabilidad y Descarga de Datos:</strong> Con anterioridad al cierre efectivo de su cuenta, el Cliente tiene derecho a exportar su información comercial (catálogos, reportes de ventas y clientes) mediante las herramientas de exportación habilitadas en la plataforma.</li>
            <li><strong>Supresión Segura:</strong> Transcurridos treinta (30) días calendario desde la terminación definitiva de la cuenta, Aura ERP procederá al borrado seguro de los registros operativos del Cliente, conservando únicamente aquellos requeridos para cumplimiento de deberes legales.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'modifications',
      title: '13. Modificaciones a los Términos de Servicio',
      shortTitle: 'Modificaciones del Contrato',
      icon: Globe,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP se reserva el derecho de revisar y modificar estos Términos de Servicio en cualquier momento para reflejar cambios normativos, mejoras tecnológicas o ajustes en el modelo de negocio.
          </p>
          <p>
            Toda modificación sustancial será informada al Cliente con una antelación mínima razonable a través de una notificación destacada en la plataforma o mediante los paneles informativos del sistema.
          </p>
          <p className="text-xs text-slate-500">
            El uso continuo de la Plataforma con posterioridad a la fecha de entrada en vigencia de las modificaciones constituirá la aceptación plena e incondicional de los nuevos términos.
          </p>
        </div>
      )
    },
    {
      id: 'law',
      title: '14. Ley Aplicable, Jurisdicción y Solución de Controversias',
      shortTitle: 'Ley Aplicable & Arbitraje',
      icon: Scale,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Los presentes Términos de Servicio y cualquier controversia o reclamación derivada de su interpretación o ejecución se regirán e interpretarán conforme a las <strong>leyes de la República del Perú</strong>, con sujeción subsidiaria a los principios internacionales de contratos comerciales y comercio electrónico (UNIDROIT / UNCITRAL).
          </p>
          <p>
            En caso de suscitarse cualquier controversia, las partes se comprometen a buscar en primera instancia una solución amigable de buena fe en un plazo no mayor a treinta (30) días calendario. De no alcanzarse un acuerdo, las partes se someten a la competencia de los jueces y tribunales de la ciudad de Lima, Perú, o a los mecanismos arbitrales acordados contractualmente, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
          </p>
        </div>
      )
    },
    {
      id: 'contact',
      title: '15. Canales de Atención y Notificaciones Oficiales',
      shortTitle: 'Atención & Notificaciones',
      icon: HelpCircle,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Para consultas sobre el alcance de estos Términos de Servicio, soporte operativo o administración de cuentas, ponemos a su disposición los canales integrados en la plataforma:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Canal de Soporte en Plataforma</span>
              <p className="text-sm font-bold text-blue-600 mt-1">
                Panel de Administración / Mesa de Ayuda
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Acceso seguro para empresas y usuarios autenticados con tickets de atención.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Gestión de Cuentas y Privacidad</span>
              <p className="text-sm font-bold text-slate-900 mt-1">
                Módulo de Configuración del ERP
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Exportación de datos, administración de roles, sucursales y suscripciones.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = searchTerm.trim() === ''
    ? sections
    : sections.filter(sec => 
        sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.shortTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handlePrint = () => {
    window.print();
  };

  const legalSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': 'Términos de Servicio Oficiales - Aura ERP',
    'description': 'Términos y condiciones legales de uso de la plataforma SaaS y Punto de Venta (POS) en la nube Aura ERP.',
    'url': window.location.href,
    'dateModified': '2026-08-18',
    'publisher': {
      '@type': 'Organization',
      'name': 'Aura ERP',
      'logo': {
        '@type': 'ImageObject',
        'url': `${window.location.origin}/logo.png`
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white">
      <SEO
        title="Términos de Servicio Oficiales"
        description="Conoce los Términos de Servicio oficiales de Aura ERP. Marco legal B2B, privacidad de datos (Ley 29733 / RGPD), integraciones de CRM y seguridad cloud."
        keywords="terminos de servicio, terms of service, legal, Aura ERP, contrato SaaS, privacidad datos, ley 29733, RGPD, tiktok CRM compliance"
        jsonLd={legalSchema}
      />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  Aura <span className="text-blue-600">ERP</span>
                </span>
                <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                  Legal &amp; Compliance
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir / PDF</span>
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all"
            >
              Acceder al ERP
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Documento Legal Oficial y Vinculante</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Términos de Servicio de <span className="text-blue-600">Aura ERP</span>
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              El presente contrato regula los términos y condiciones de uso de la plataforma de software en la nube, módulos de punto de venta (POS), inventario, gestión de personal, CRM y servicios integrados.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Última actualización: {lastUpdated}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vigencia: {effectiveDate}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Servicio B2B para Negocios</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area: Sidebar TOC + Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4 print:hidden">
            {/* Search within document */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en el documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-100">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Tabla de Contenidos</span>
                <span>{filteredSections.length} Secciones</span>
              </div>

              <nav className="mt-2 space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      onClick={() => setActiveSection(sec.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate">{sec.shortTitle}</span>
                      </div>
                      <ChevronRight className={`w-3 h-3 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-300'}`} />
                    </a>
                  );
                })}
              </nav>
            </div>

            {/* Quick Contact Legal Box */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Atención y Soporte
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                El soporte operativo y las solicitudes relativas a la cuenta se atienden de forma prioritaria dentro del sistema.
              </p>
              <Link
                to="/login"
                className="mt-3 inline-flex items-center justify-center w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Acceder al Panel
              </Link>
            </div>
          </aside>

          {/* Legal Sections Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 text-blue-600">
                <Shield className="w-4 h-4" />
                Resumen Ejecutivo para Usuarios y Empresas
              </h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Para facilitar su lectura, a continuación resumimos los aspectos fundamentales de nuestra relación comercial:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tus Datos te Pertenecen</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No comercializamos ni compartimos tu catálogo o ventas con terceros.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Seguridad RLS Supabase</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Aislamiento absoluto de datos entre empresas y sucursales en PostgreSQL.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Integración TikTok Oficial</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Operación bajo OAuth 2.0 y directrices para desarrolladores de TikTok.
                  </p>
                </div>
              </div>
            </div>

            {/* Render Each Legal Section */}
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs scroll-mt-24 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {sec.title}
                    </h2>
                  </div>
                  {sec.content}
                </article>
              );
            })}

            {/* Final Acceptance Footer Note */}
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-600 leading-relaxed max-w-xl mx-auto">
                Al continuar utilizando o contratando Aura ERP, Usted confirma formalmente su conformidad con la totalidad de los términos y cláusulas descritas en este documento.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Continuar al Sistema
                </Link>
                <Link
                  to="/"
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Volver a la Portada
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 print:hidden mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Aura ERP</span>
          </div>

          <p className="text-xs text-slate-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} Aura ERP. Todos los derechos reservados. Plataforma de Gestión Empresarial y POS en la Nube.
          </p>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link to="/terms" className="text-blue-400 hover:text-white transition-colors font-medium">Términos de Servicio</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link to="/login" className="hover:text-white transition-colors">Centro de Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
