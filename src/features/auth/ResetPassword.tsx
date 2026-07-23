import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle2, AlertCircle, Key, ArrowLeft } from 'lucide-react';

const translations = {
  es: {
    title: 'Restablecer Contraseña',
    subtitle: 'Ingresa el código de 6 dígitos que te proporcionó tu administrador y tu nueva contraseña.',
    code: 'Código de verificación',
    newPassword: 'Nueva Contraseña',
    submit: 'Restablecer Contraseña',
    submitting: 'Procesando...',
    success: '¡Contraseña restablecida con éxito!',
    backToLogin: 'Volver al inicio de sesión',
    error: 'Error al restablecer la contraseña',
    codeHint: 'Código de 6 dígitos',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter the 6-digit code provided by your administrator and your new password.',
    code: 'Verification code',
    newPassword: 'New Password',
    submit: 'Reset Password',
    submitting: 'Processing...',
    success: 'Password reset successfully!',
    backToLogin: 'Back to login',
    error: 'Error resetting password',
    codeHint: '6-digit code',
  }
};

export const ResetPassword: React.FC = () => {
  const { lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const t = translations[lang];

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError(lang === 'es' ? 'El código debe tener 6 dígitos' : 'Code must be 6 digits');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
        body: { code, new_password: password },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.success}</h2>
          <Link to="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/10">
            {t.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-6">
        <button
          onClick={toggleLanguage}
          className="absolute top-6 right-6 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </button>

        <div className="space-y-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">{t.title}</h2>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.code}</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-mono font-bold text-center text-2xl tracking-[0.3em]"
            />
            <p className="text-[10px] text-slate-400">{t.codeHint}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t.newPassword}</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>{t.submit}</span>
            )}
          </button>
        </form>

        <Link to="/login"
          className="flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.backToLogin}
        </Link>
      </div>
    </div>
  );
};
