import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Globe,
  Sparkles,
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
  Eye,
  Database,
  Users,
  FileText,
  HelpCircle,
  Fingerprint,
  Share2,
  Trash2,
  Bell
} from 'lucide-react';
import { SEO } from '../../components/SEO';

interface Section {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

export const PrivacyPolicy: React.FC = () => {
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
      title: '1. Introducción y Compromiso con su Privacidad',
      shortTitle: 'Introducción',
      icon: Shield,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            <strong>Aura ERP</strong> (en adelante, &ldquo;la Plataforma&rdquo;, &ldquo;el Software&rdquo;, &ldquo;Nosotros&rdquo; o &ldquo;el Proveedor&rdquo;) se compromete a proteger la privacidad y los datos personales de todos sus usuarios, clientes y colaboradores que interactúan con nuestros servicios.
          </p>
          <p>
            La presente Política de Privacidad describe de manera clara y transparente qué datos personales recopilamos, cómo los utilizamos, con quién los compartimos, cómo los protegemos y cuáles son los derechos que le asisten como titular de dichos datos.
          </p>
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Marco Legal Aplicable:</strong> Esta política se rige conforme a la <strong>Ley N° 29733</strong> (Ley de Protección de Datos Personales del Perú) y su Reglamento (D.S. 003-2013-JUS), el <strong>Reglamento General de Protección de Datos de la Unión Europea (RGPD / GDPR - Reglamento UE 2016/679)</strong>, y la <strong>California Consumer Privacy Act (CCPA / CPRA)</strong>.
            </div>
          </div>
          <p>
            Al utilizar Aura ERP, Usted declara haber leído, comprendido y aceptado el tratamiento de sus datos personales conforme a los términos aquí descritos. Si no está de acuerdo con alguno de estos términos, le rogamos abstenerse de utilizar nuestros servicios.
          </p>
        </div>
      )
    },
    {
      id: 'controller',
      title: '2. Identidad del Responsable del Tratamiento',
      shortTitle: 'Responsable del Tratamiento',
      icon: Building2,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            A efectos de la legislación de protección de datos, la identidad y datos de contacto del responsable del tratamiento son los siguientes:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Responsable del Tratamiento</span>
              <p className="text-sm font-bold text-slate-900 mt-1">Aura ERP</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Canal de Privacidad y DPO</span>
              <p className="text-sm font-bold text-blue-600 mt-1">Panel de Administración / Mesa de Ayuda</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Jurisdicción</span>
              <p className="text-sm font-bold text-slate-900 mt-1">República del Perú</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Naturaleza del Servicio</span>
              <p className="text-sm font-bold text-slate-900 mt-1">SaaS B2B (Software como Servicio para Empresas)</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <strong className="text-xs font-bold text-slate-900 uppercase tracking-wider">Roles en el Tratamiento de Datos:</strong>
            <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
              <li>
                <strong>Aura ERP como Responsable del Tratamiento:</strong> Para los datos de registro, autenticación y configuración de la cuenta del Cliente empresarial (nombre del titular, correo electrónico, credenciales cifradas, configuración de empresa).
              </li>
              <li>
                <strong>Aura ERP como Encargado del Tratamiento (Data Processor):</strong> Para los datos de clientes finales, inventarios, ventas, empleados y conversaciones CRM que el Cliente introduce y almacena dentro de la plataforma. En este supuesto, el Cliente retiene la condición de Responsable del Tratamiento respecto a los datos de sus propios clientes y colaboradores.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'data-collected',
      title: '3. Datos Personales que Recopilamos',
      shortTitle: 'Datos Recopilados',
      icon: Database,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            A continuación se detallan las categorías de datos personales que Aura ERP recopila y trata, clasificados según su origen y finalidad:
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <strong className="text-slate-900 font-semibold text-sm">Datos de Registro y Autenticación</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-9">
                <li>Nombre completo del titular de la cuenta</li>
                <li>Correo electrónico corporativo</li>
                <li>Contraseña (almacenada exclusivamente en formato hash criptográfico; Aura ERP no tiene acceso a la contraseña en texto plano)</li>
                <li>Rol asignado en el sistema (Administrador, Cajero, Barbero, etc.)</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <strong className="text-slate-900 font-semibold text-sm">Datos de la Empresa del Cliente</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-9">
                <li>Razón social o nombre comercial</li>
                <li>Rubro o giro de negocio</li>
                <li>Identificación fiscal (RUC, cuando se proporcione)</li>
                <li>Nombres y configuración de sucursales</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <strong className="text-slate-900 font-semibold text-sm">Datos Operativos y Comerciales (Procesados como Encargado)</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-9">
                <li>Catálogo de productos: nombres, descripciones, precios, categorías, niveles de stock</li>
                <li>Registros de ventas: montos, métodos de pago, tickets, fechas y horas</li>
                <li>Datos de clientes del negocio: nombre, teléfono, correo electrónico</li>
                <li>Datos de personal y colaboradores: nombre, porcentaje de comisión, registros de asistencia</li>
                <li>Movimientos de caja: aperturas, cierres de turno, ingresos, egresos, arqueos</li>
                <li>Registros de compras a proveedores</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <strong className="text-slate-900 font-semibold text-sm">Datos de Integraciones con Terceros (TikTok CRM)</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-9">
                <li>TikTok User ID del contacto</li>
                <li>Nombre de usuario y avatar público de TikTok</li>
                <li>Contenido de mensajes directos sincronizados</li>
                <li>Tokens de acceso OAuth 2.0 (cifrados en reposo)</li>
                <li>Etiquetas de conversación y notas internas del CRM</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <strong className="text-slate-900 font-semibold text-sm">Datos Técnicos y de Navegación</strong>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside ml-9">
                <li>Dirección IP de conexión (para seguridad y auditoría)</li>
                <li>Tipo de navegador y sistema operativo</li>
                <li>Marcas de tiempo de inicio y cierre de sesión</li>
                <li>Datos de rendimiento y logs del sistema (anonimizados)</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-xs leading-relaxed flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Datos NO Recopilados:</strong> Aura ERP NO recopila datos de geolocalización GPS, datos biométricos, datos de salud, ni información de menores de edad. La plataforma está diseñada exclusivamente para uso comercial B2B por personas mayores de 18 años.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'legal-basis',
      title: '4. Base Legal y Finalidades del Tratamiento',
      shortTitle: 'Base Legal & Finalidades',
      icon: FileText,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            El tratamiento de sus datos personales se fundamenta en las siguientes bases legales, conforme a la Ley N° 29733 del Perú y el artículo 6 del RGPD:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3 border-b border-slate-200">Base Legal</th>
                  <th className="px-4 py-3 border-b border-slate-200">Finalidad</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Ejecución del Contrato</td>
                  <td className="px-4 py-3">Proveer acceso a la plataforma SaaS, gestionar la cuenta, habilitar módulos contratados (POS, inventario, cajas, CRM).</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Interés Legítimo</td>
                  <td className="px-4 py-3">Prevenir fraude, garantizar la seguridad del sistema, mejorar la estabilidad y rendimiento del servicio, generar estadísticas agregadas anonimizadas.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Cumplimiento Legal</td>
                  <td className="px-4 py-3">Cumplir con obligaciones legales, requerimientos de autoridades competentes, conservación de registros contables y auditorías.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-800">Consentimiento</td>
                  <td className="px-4 py-3">Vinculación de cuentas de terceros (TikTok OAuth 2.0), envío de comunicaciones promocionales (si aplica en el futuro).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Aura ERP se adhiere al principio de minimización de datos y únicamente recopila la información estrictamente necesaria para las finalidades declaradas.
          </p>
        </div>
      )
    },
    {
      id: 'data-sharing',
      title: '5. Compartición de Datos y Subencargados',
      shortTitle: 'Compartición de Datos',
      icon: Share2,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs leading-relaxed flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Principio Fundamental:</strong> Aura ERP NO vende, NO alquila y NO comercializa los datos personales de sus clientes ni los datos comerciales almacenados en la plataforma a terceros anunciantes, brokers de datos o entidades de marketing.
            </div>
          </div>

          <p>Los datos pueden ser compartidos únicamente con las siguientes categorías de destinatarios, bajo estrictas obligaciones contractuales de confidencialidad:</p>

          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Proveedores de Infraestructura Cloud</strong>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Supabase Inc.</strong> (PostgreSQL gestionado, autenticación, almacenamiento y Edge Functions). Los datos residen en centros de datos con certificaciones de seguridad estándar de la industria. Supabase actúa como subencargado del tratamiento.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Plataformas de Integración (TikTok / ByteDance)</strong>
              <p className="text-xs text-slate-600 mt-1">
                Cuando el Cliente activa la integración CRM con TikTok, se intercambian datos de mensajería y tokens de autenticación conforme a las <em>TikTok Developer Platform Privacy Guidelines</em>. Aura ERP no comparte datos adicionales más allá de los estrictamente requeridos por la API.
              </p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Autoridades Legales y Reguladoras</strong>
              <p className="text-xs text-slate-600 mt-1">
                Los datos pueden ser divulgados cuando así lo exija una orden judicial firme, requerimiento de autoridad administrativa competente (Autoridad Nacional de Protección de Datos Personales del Perú, autoridades de supervisión de la UE) o para la defensa legal de Aura ERP.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      title: '6. Medidas de Seguridad Técnicas y Organizativas',
      shortTitle: 'Seguridad de la Información',
      icon: Lock,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP implementa medidas de seguridad técnicas, administrativas y organizativas de conformidad con estándares internacionales para proteger los datos personales contra acceso no autorizado, alteración, divulgación o destrucción:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <strong className="text-xs font-bold text-slate-900">Cifrado en Tránsito</strong>
              </div>
              <p className="text-xs text-slate-600">Todas las comunicaciones están protegidas mediante TLS/HTTPS (Transport Layer Security).</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <strong className="text-xs font-bold text-slate-900">Cifrado en Reposo</strong>
              </div>
              <p className="text-xs text-slate-600">Las bases de datos PostgreSQL en Supabase utilizan cifrado AES-256 en reposo.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <strong className="text-xs font-bold text-slate-900">Row Level Security (RLS)</strong>
              </div>
              <p className="text-xs text-slate-600">Aislamiento estricto de datos a nivel de fila en PostgreSQL entre diferentes empresas y sucursales.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <strong className="text-xs font-bold text-slate-900">Hash de Contraseñas</strong>
              </div>
              <p className="text-xs text-slate-600">Las contraseñas se almacenan mediante algoritmos de hash criptográfico unidireccional (bcrypt). Nunca en texto plano.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <strong className="text-xs font-bold text-slate-900">Control de Acceso Basado en Roles</strong>
              </div>
              <p className="text-xs text-slate-600">Permisos granulares por usuario (Admin, Cajero, Barbero) que limitan el acceso a la información estrictamente necesaria.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <strong className="text-xs font-bold text-slate-900">Copias de Seguridad Automáticas</strong>
              </div>
              <p className="text-xs text-slate-600">Backups periódicos automáticos con capacidad de restauración ante contingencias o pérdida de datos.</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Notificación de Brechas de Seguridad:</strong> En caso de detectarse una brecha de seguridad que afecte datos personales, Aura ERP se compromete a notificar a la autoridad de protección de datos competente y a los titulares afectados en un plazo no mayor a setenta y dos (72) horas, conforme lo establece el artículo 33 del RGPD y la normativa peruana aplicable.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'rights',
      title: '7. Derechos del Titular de los Datos (ARCO / RGPD / CCPA)',
      shortTitle: 'Sus Derechos de Privacidad',
      icon: Fingerprint,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            De conformidad con la legislación aplicable, Usted tiene los siguientes derechos respecto a sus datos personales:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900 text-sm font-semibold block">Derecho de Acceso</strong>
                <p className="text-xs text-slate-600 mt-0.5">Solicitar y obtener confirmación sobre si se están tratando sus datos personales, así como acceder a una copia de los mismos.</p>
              </div>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900 text-sm font-semibold block">Derecho de Rectificación</strong>
                <p className="text-xs text-slate-600 mt-0.5">Solicitar la corrección de datos personales inexactos o incompletos.</p>
              </div>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900 text-sm font-semibold block">Derecho de Supresión (&ldquo;Derecho al Olvido&rdquo;)</strong>
                <p className="text-xs text-slate-600 mt-0.5">Solicitar la eliminación de sus datos personales cuando ya no sean necesarios para las finalidades para las que fueron recogidos, sujeto a obligaciones legales de conservación.</p>
              </div>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900 text-sm font-semibold block">Derecho de Oposición y Limitación</strong>
                <p className="text-xs text-slate-600 mt-0.5">Oponerse al tratamiento de sus datos en determinadas circunstancias, o solicitar la limitación del mismo mientras se resuelve una controversia sobre la exactitud de los datos.</p>
              </div>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-900 text-sm font-semibold block">Derecho a la Portabilidad</strong>
                <p className="text-xs text-slate-600 mt-0.5">Recibir sus datos en un formato estructurado, de uso común y lectura mecánica, y transmitirlos a otro responsable. Aura ERP ofrece herramientas de exportación en formatos estándar (Excel/CSV).</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <strong className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ejercicio de Derechos:</strong>
            <p className="text-xs text-slate-600 leading-relaxed">
              Para ejercer cualquiera de estos derechos, el titular puede gestionar su solicitud directamente desde el <strong>Panel de Administración</strong> de la plataforma (exportar datos, modificar perfil, gestionar cuenta) o mediante un requerimiento formal a través de la mesa de ayuda del sistema. Aura ERP atenderá las solicitudes dentro de los plazos legales establecidos (máximo 30 días calendario en Perú y 30 días conforme RGPD).
            </p>
          </div>

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
            <strong className="text-xs font-bold text-blue-900 uppercase tracking-wider">Derechos Adicionales para Residentes de California (CCPA/CPRA):</strong>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Derecho a conocer qué información personal se ha recopilado sobre usted.</li>
              <li>Derecho a solicitar la eliminación de su información personal.</li>
              <li>Derecho a no ser discriminado por ejercer sus derechos de privacidad.</li>
              <li><strong>Aura ERP no vende información personal</strong> conforme a la definición de &ldquo;venta&rdquo; de la CCPA.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'retention',
      title: '8. Período de Conservación de los Datos',
      shortTitle: 'Retención de Datos',
      icon: Clock,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Los datos personales serán conservados durante el tiempo estrictamente necesario para cumplir con las finalidades para las que fueron recopilados, y en todo caso conforme a los siguientes criterios:
          </p>
          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Datos de Cuenta Activa</strong>
              <p className="text-xs text-slate-600 mt-1">Se conservan mientras el Cliente mantenga una suscripción o cuenta activa en la plataforma.</p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Datos Tras Cancelación</strong>
              <p className="text-xs text-slate-600 mt-1">Transcurridos treinta (30) días calendario desde la cancelación definitiva de la cuenta, se procederá al borrado seguro de los datos operativos, conservando exclusivamente los registros requeridos por obligaciones legales (tributarias, contables, judiciales).</p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Registros de Auditoría y Logs</strong>
              <p className="text-xs text-slate-600 mt-1">Los logs de seguridad y auditoría se conservan por un período mínimo de un (1) año para fines de trazabilidad y cumplimiento normativo, tras lo cual son eliminados o anonimizados.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cookies',
      title: '9. Cookies y Tecnologías de Seguimiento',
      shortTitle: 'Cookies & Seguimiento',
      icon: Globe,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP utiliza tecnologías estándar del navegador para el correcto funcionamiento de la plataforma:
          </p>
          <div className="space-y-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Cookies Estrictamente Necesarias</strong>
              <p className="text-xs text-slate-600 mt-1">Cookies de sesión y tokens de autenticación (JWT) para mantener la sesión activa del usuario de forma segura. Estas cookies son esenciales y no pueden desactivarse.</p>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <strong className="text-slate-900 font-semibold block text-sm">Almacenamiento Local (localStorage)</strong>
              <p className="text-xs text-slate-600 mt-1">Se utiliza para almacenar preferencias de idioma, configuración de la interfaz y tokens de sesión de Supabase Auth.</p>
            </div>
          </div>
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-900 text-xs leading-relaxed flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Sin Cookies de Marketing:</strong> Aura ERP <strong>NO</strong> utiliza cookies de terceros con fines publicitarios, cookies de rastreo cross-site, píxeles de seguimiento ni herramientas de retargeting.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'international',
      title: '10. Transferencias Internacionales de Datos',
      shortTitle: 'Transferencias Internacionales',
      icon: Globe,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Los datos almacenados en Aura ERP pueden ser procesados en servidores ubicados fuera del territorio peruano, específicamente en los centros de datos de Supabase Inc. (Estados Unidos y/o Unión Europea).
          </p>
          <p>
            Dichas transferencias se realizan bajo las siguientes salvaguardas:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
            <li><strong>Cláusulas Contractuales Estándar (SCCs):</strong> Los contratos con subencargados del tratamiento incluyen cláusulas tipo aprobadas por la Comisión Europea para garantizar un nivel adecuado de protección.</li>
            <li><strong>Cifrado End-to-End en Tránsito:</strong> Todas las transferencias de datos se realizan a través de conexiones cifradas TLS/HTTPS.</li>
            <li><strong>Cumplimiento del Marco UE-EEUU:</strong> Nuestros proveedores de infraestructura operan bajo los marcos de protección de datos reconocidos internacionalmente.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'children',
      title: '11. Protección de Menores de Edad',
      shortTitle: 'Menores de Edad',
      icon: Users,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP es una plataforma de gestión empresarial B2B y <strong>NO está dirigida a menores de 18 años</strong>. No recopilamos de manera consciente o deliberada datos personales de menores de edad.
          </p>
          <p>
            En cumplimiento de la <strong>Children&apos;s Online Privacy Protection Act (COPPA)</strong> de Estados Unidos y las disposiciones equivalentes del RGPD (artículo 8), si tuviéramos conocimiento de que se han recopilado datos de un menor sin el consentimiento verificable de su padre, madre o tutor legal, procederemos a eliminar dicha información de manera inmediata.
          </p>
        </div>
      )
    },
    {
      id: 'tiktok',
      title: '12. Disposiciones Específicas para la Integración con TikTok',
      shortTitle: 'Privacidad TikTok CRM',
      icon: Shield,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            El módulo CRM de Aura ERP permite al Cliente integrar su cuenta de TikTok for Business para gestionar mensajes directos. En relación con esta integración:
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <strong>Autenticación Segura:</strong> La vinculación se realiza exclusivamente mediante OAuth 2.0. Aura ERP nunca solicita ni almacena las contraseñas de TikTok del Cliente.
              </li>
              <li>
                <strong>Alcance de los Permisos:</strong> Los permisos solicitados se limitan a <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">im.direct_messages</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">im.users</code> y <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">user.info.profile</code>, necesarios únicamente para la funcionalidad de CRM.
              </li>
              <li>
                <strong>Uso Limitado de los Datos:</strong> Los datos obtenidos de TikTok se utilizan exclusivamente para mostrar y responder conversaciones dentro del CRM del Cliente. No se utilizan para perfilado, publicidad, ni se comparten con otros clientes de Aura ERP.
              </li>
              <li>
                <strong>Almacenamiento Aislado:</strong> Los tokens y datos de conversaciones de TikTok se almacenan de forma aislada por empresa mediante Row Level Security (RLS), impidiendo el acceso cruzado entre diferentes cuentas de Aura ERP.
              </li>
              <li>
                <strong>Revocación:</strong> El Cliente puede revocar el acceso de Aura ERP a su cuenta de TikTok en cualquier momento desde la configuración del módulo CRM o directamente desde el panel de desarrollador de TikTok.
              </li>
              <li>
                <strong>Eliminación de Datos:</strong> Al desvincular la cuenta de TikTok o cancelar la suscripción, los tokens de acceso y datos de conversaciones sincronizados serán eliminados de nuestros sistemas conforme a nuestra política de retención.
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'updates',
      title: '13. Modificaciones a esta Política de Privacidad',
      shortTitle: 'Modificaciones',
      icon: Bell,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Aura ERP se reserva el derecho de actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas de tratamiento de datos, nuevas funcionalidades del servicio o modificaciones normativas.
          </p>
          <p>
            Las actualizaciones sustanciales serán comunicadas al Cliente con una antelación razonable mediante avisos destacados dentro de la plataforma. Se recomienda al usuario revisar periódicamente este documento.
          </p>
          <p className="text-xs text-slate-500">
            La fecha de la última actualización se indica al inicio de este documento. El uso continuado de la Plataforma tras la publicación de modificaciones constituirá la aceptación de la política actualizada.
          </p>
        </div>
      )
    },
    {
      id: 'contact',
      title: '14. Canales para Consultas de Privacidad',
      shortTitle: 'Consultas de Privacidad',
      icon: HelpCircle,
      content: (
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Para cualquier consulta, solicitud de ejercicio de derechos o reclamación relacionada con el tratamiento de sus datos personales, ponemos a su disposición los siguientes canales:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Canal de Privacidad en Plataforma</span>
              <p className="text-sm font-bold text-blue-600 mt-1">Panel de Administración / Mesa de Ayuda</p>
              <p className="text-[11px] text-slate-500 mt-1">Acceso seguro para solicitudes ARCO, portabilidad de datos y gestión de consentimientos.</p>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Autoridad de Supervisión</span>
              <p className="text-sm font-bold text-slate-900 mt-1">Autoridad Nacional de Protección de Datos Personales (Perú)</p>
              <p className="text-[11px] text-slate-500 mt-1">Si no está satisfecho con nuestra respuesta, puede presentar una reclamación ante la ANPDP.</p>
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
    'name': 'Política de Privacidad Oficial - Aura ERP',
    'description': 'Política de Privacidad oficial de Aura ERP. Tratamiento de datos personales conforme a Ley 29733, RGPD/GDPR y CCPA.',
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
        title="Política de Privacidad Oficial"
        description="Política de Privacidad oficial de Aura ERP. Protección de datos personales bajo la Ley 29733 (Perú), RGPD/GDPR (UE), CCPA (California) y TikTok Developer Privacy Guidelines."
        keywords="politica de privacidad, privacy policy, proteccion de datos, RGPD, GDPR, CCPA, ley 29733, Aura ERP, datos personales, tiktok privacy"
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
                  Privacy &amp; Data Protection
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Protección de Datos Personales</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Política de Privacidad de <span className="text-blue-600">Aura ERP</span>
            </h1>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              Detalle completo sobre cómo recopilamos, utilizamos, protegemos y gestionamos sus datos personales en cumplimiento de la legislación nacional e internacional de protección de datos.
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
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>Ley 29733 / RGPD / CCPA</span>
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en la política..."
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

            {/* Quick Links Box */}
            <div className="bg-gradient-to-br from-emerald-50 to-blue-50/50 p-5 rounded-2xl border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Documentos Relacionados
              </h4>
              <div className="mt-3 space-y-2">
                <Link
                  to="/terms"
                  className="flex items-center justify-between w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl border border-slate-200 transition-colors"
                >
                  <span>Términos de Servicio</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center justify-center w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Gestionar mis Datos
                </Link>
              </div>
            </div>
          </aside>

          {/* Privacy Sections Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Summary Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                Resumen de Privacidad para su Empresa
              </h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Puntos clave que debe conocer sobre cómo Aura ERP protege su información:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>No Vendemos sus Datos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sus datos comerciales no se venden ni comparten con anunciantes.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cifrado Total</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    TLS/HTTPS en tránsito + AES-256 en reposo + RLS para aislamiento.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Derechos ARCO Completos</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Acceso, rectificación, supresión, oposición y portabilidad garantizados.
                  </p>
                </div>
              </div>
            </div>

            {/* Render Each Section */}
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <article
                  key={sec.id}
                  id={sec.id}
                  className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs scroll-mt-24 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
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
                Al continuar utilizando Aura ERP, Usted acepta el tratamiento de sus datos personales conforme a la presente Política de Privacidad.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Continuar al Sistema
                </Link>
                <Link
                  to="/terms"
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Ver Términos de Servicio
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
            <Link to="/terms" className="hover:text-white transition-colors">Términos de Servicio</Link>
            <Link to="/privacy" className="text-emerald-400 hover:text-white transition-colors font-medium">Política de Privacidad</Link>
            <Link to="/login" className="hover:text-white transition-colors">Centro de Soporte</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
