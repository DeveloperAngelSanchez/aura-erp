import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';

const translations = {
  es: {
    welcome: '¡Bienvenido de nuevo!',
    subtitle: 'Ingresa tu correo y contraseña para acceder a tu cuenta.',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    rememberMe: 'Recordarme',
    forgotPassword: '¿Olvidaste tu contraseña?',
    logIn: 'Iniciar Sesión',
    loggingIn: 'Iniciando sesión...',
    orLoginWith: 'O iniciar sesión con',
    noAccount: '¿No tienes una cuenta?',
    registerNow: 'Regístrate ahora',
    copyright: 'Copyright © 2025 Aura Enterprises LTD.',
    privacyPolicy: 'Política de Privacidad',
    slogan: 'Administra tu equipo y operaciones sin esfuerzo.',
    sloganSub: 'Inicia sesión para acceder a tu panel de CRM y gestionar tu equipo.',
    totalSales: 'Ventas Totales',
    totalProfit: 'Ganancias Totales',
    fromLastMonth: 'desde el mes pasado',
    chatPerf: 'Rendimiento Chat',
    avgResponse: 'promedio de respuesta',
    salesCategories: 'Categorías de Ventas',
    productTransaction: 'Transacciones de Productos',
    orderId: 'ID Orden',
    product: 'Producto',
    date: 'Fecha',
    price: 'Precio',
  },
  en: {
    welcome: 'Welcome Back',
    subtitle: 'Enter your email and password to access your account.',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Your Password?',
    logIn: 'Log In',
    loggingIn: 'Logging in...',
    orLoginWith: 'Or Login With',
    noAccount: "Don't Have An Account?",
    registerNow: 'Register Now.',
    copyright: 'Copyright © 2025 Aura Enterprises LTD.',
    privacyPolicy: 'Privacy Policy',
    slogan: 'Effortlessly manage your team and operations.',
    sloganSub: 'Log in to access your CRM dashboard and manage your team.',
    totalSales: 'Total Sales',
    totalProfit: 'Total Profit',
    fromLastMonth: 'From last month',
    chatPerf: 'Chat Perf.',
    avgResponse: 'Avg response',
    salesCategories: 'Sales Categories',
    productTransaction: 'Product Transaction',
    orderId: 'Order ID',
    product: 'Product',
    date: 'Date',
    price: 'Price',
  }
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('aura_remembered_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('aura_remembered_email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { lang, toggleLanguage } = useLanguage();

  const navigate = useNavigate();
  const t = translations[lang];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (rememberMe) {
        localStorage.setItem('aura_remembered_email', email);
      } else {
        localStorage.removeItem('aura_remembered_email');
      }

      if (data?.user) {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || (lang === 'es' ? 'Credenciales incorrectas' : 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      
      {/* Lado Izquierdo: Formulario */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-8 lg:p-16 relative safe-area-padding min-h-screen lg:min-h-0 overflow-y-auto">
        
        {/* Language Selector (Top Right) */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="absolute top-6 right-6 z-20 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          🌐 {lang === 'es' ? 'ES' : 'EN'}
        </button>

        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Aura" className="w-10 h-10 object-contain rounded-xl" />
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">Aura</span>
        </div>

        {/* Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8 lg:py-12 space-y-6 lg:space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              {t.welcome}
            </h2>
            <p className="text-slate-500 text-sm">
              {t.subtitle}
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                {t.email}
              </label>
              <input
                type="email"
                required
                placeholder="sellostore@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                {t.password}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="5ellostore."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none text-lg"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs lg:text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{t.rememberMe}</span>
              </label>
              <Link to="/reset-password" className="text-blue-600 hover:underline font-medium">
                {t.forgotPassword}
              </Link>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{t.loggingIn}</span>
                </>
              ) : (
                <span>{t.logIn}</span>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider absolute">
              {t.orLoginWith}
            </span>
          </div>

          {/* Social Sign In (Mocked) */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:border-slate-300"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              className="py-2.5 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:border-slate-300"
            >
              <svg className="w-4 h-4 fill-slate-800" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.12.02.13.02.24.02.86 0 1.98-.54 2.57-1.35z"/>
              </svg>
              Apple
            </button>
          </div>


        </div>

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 pt-6 border-t border-slate-100 gap-2">
          <span>{t.copyright}</span>
          <div className="flex gap-4">
            <a href="#privacy" className="hover:underline">{t.privacyPolicy}</a>
          </div>
        </div>
      </div>

      {/* Lado Derecho: Dashboard Mockup */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative overflow-hidden flex-col justify-between p-16">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-25 -ml-20 -mb-20"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-700/50 via-blue-600/30 to-indigo-700/40"></div>

        {/* Slogan */}
        <div className="relative z-10 space-y-4 max-w-xl">
          <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
            {t.slogan}
          </h2>
          <p className="text-blue-100 text-base leading-relaxed">
            {t.sloganSub}
          </p>
        </div>

        {/* Mockup Dashboard Area */}
        <div className="relative z-10 w-[120%] -mr-[30%] bg-slate-900/90 rounded-2xl border border-slate-700/50 shadow-2xl p-6 space-y-6 backdrop-blur-md transform rotate-1 translate-y-8">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Dashboard v2.5</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/40">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.totalSales}</span>
                <span className="text-slate-500 text-xs">•••</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">$189,374</p>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium inline-block mt-2">
                ↑ 12% {t.fromLastMonth}
              </span>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/40">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t.totalProfit}</span>
                <span className="text-slate-500 text-xs">•••</span>
              </div>
              <p className="text-xl font-bold text-white mt-1">$25,684</p>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium inline-block mt-2">
                ↑ 8% {t.fromLastMonth}
              </span>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/40">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{t.chatPerf}</span>
              <p className="text-xl font-bold text-white mt-1">00:01:30</p>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium inline-block mt-2">
                ↑ 5% {t.avgResponse}
              </span>
            </div>
          </div>

          {/* Large Card: Sales categories & recent transactions */}
          <div className="grid grid-cols-3 gap-4">
            {/* Sales Categories Chart */}
            <div className="col-span-1 bg-slate-800/80 p-4 rounded-xl border border-slate-700/40 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">{t.salesCategories}</span>
              <div className="my-3 flex justify-center items-center relative">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                  <circle cx="40" cy="40" r="32" stroke="#3b82f6" strokeWidth="8" strokeDasharray="200" strokeDashoffset="50" fill="transparent" />
                  <circle cx="40" cy="40" r="32" stroke="#10b981" strokeWidth="8" strokeDasharray="200" strokeDashoffset="120" fill="transparent" />
                </svg>
                <div className="absolute text-center">
                  <span className="text-[9px] text-slate-400 block leading-none">Total</span>
                  <span className="text-xs font-bold text-white leading-none">6,248</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Smartphones</span>
                  <span className="text-white font-medium">3,845</span>
                </div>
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Laptops</span>
                  <span className="text-white font-medium">1,653</span>
                </div>
              </div>
            </div>

            {/* Product Transactions */}
            <div className="col-span-2 bg-slate-800/80 p-4 rounded-xl border border-slate-700/40">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">{t.productTransaction}</span>
              <div className="space-y-2 overflow-hidden">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-1 block w-full flex justify-between">
                      <th className="w-1/4">{t.orderId}</th>
                      <th className="w-1/4">{t.product}</th>
                      <th className="w-1/4">{t.date}</th>
                      <th className="w-1/4 text-right">{t.price}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 block w-full">
                    <tr className="text-slate-300 py-1.5 flex justify-between items-center block w-full">
                      <td className="w-1/4 font-mono">#SLR9801</td>
                      <td className="w-1/4 text-white">iPad 10th</td>
                      <td className="w-1/4 text-slate-400">13 Feb, 2025</td>
                      <td className="w-1/4 text-right font-medium text-emerald-400">$449</td>
                    </tr>
                    <tr className="text-slate-300 py-1.5 flex justify-between items-center block w-full">
                      <td className="w-1/4 font-mono">#SLR9802</td>
                      <td className="w-1/4 text-white">iPhone 15</td>
                      <td className="w-1/4 text-slate-400">13 Feb, 2025</td>
                      <td className="w-1/4 text-right font-medium text-emerald-400">$799</td>
                    </tr>
                    <tr className="text-slate-300 py-1.5 flex justify-between items-center block w-full">
                      <td className="w-1/4 font-mono">#SLR9803</td>
                      <td className="w-1/4 text-white">MacBook Air</td>
                      <td className="w-1/4 text-slate-400">12 Feb, 2025</td>
                      <td className="w-1/4 text-right font-medium text-emerald-400">$999</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
